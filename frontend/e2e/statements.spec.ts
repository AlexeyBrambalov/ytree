import { daysFromNow, expect, monthsAgo, pdfFile, pngFile, QA, test } from './support'

test.describe('Uploading statements', () => {
  test('uploads a statement for a provider that has none', async ({ accounts, page }) => {
    await accounts.goto()
    await accounts.openUpload('HSBC')
    await expect(accounts.uploadDialog.getByTestId(QA.dialogTitle)).toHaveText('Upload statement')
    await expect(accounts.uploadDialog.getByTestId(QA.dialogDescription)).toHaveText(
      'HSBC · must be dated within the last 3 months.',
    )

    await accounts.chooseFile(pdfFile('hsbc_october.pdf'))
    await accounts.saveStatement()

    await expect(accounts.uploadDialog).toBeHidden()
    await expect(accounts.toast('Statement saved for HSBC')).toBeVisible()
    await accounts.expectStatus('HSBC', 'Uploaded')
    await expect(accounts.row('HSBC').getByTestId(QA.accountStatementLink)).toContainText('hsbc_october.pdf')
    await accounts.expectReady(3, 4)

    await page.reload()
    await accounts.expectStatus('HSBC', 'Uploaded')
  })

  test('replaces an outdated statement with a current one', async ({ accounts }) => {
    await accounts.goto()
    await expect(accounts.row('Vanguard').getByTestId(QA.accountUploadButton)).toHaveText('Replace')
    await accounts.openUpload('Vanguard')
    await expect(accounts.uploadDialog.getByTestId(QA.dialogTitle)).toHaveText('Replace statement')
    await accounts.uploadDialog.getByTestId(QA.uploadCancelButton).click()
    await expect(accounts.uploadDialog).toBeHidden()

    await accounts.uploadStatement('Vanguard', pdfFile('vanguard_new.pdf'))

    await accounts.expectStatus('Vanguard', 'Uploaded')
    await expect(accounts.row('Vanguard').getByTestId(QA.accountStatementLink)).toContainText('vanguard_new.pdf')
    await expect(accounts.row('Vanguard').getByTestId(QA.accountOutdatedInfo)).toHaveCount(0)
  })

  test('warns that an old statement won’t count, and it stays outdated once saved', async ({ accounts }) => {
    await accounts.goto()
    await accounts.openUpload('HSBC')
    await accounts.chooseFile(pdfFile('hsbc_old.pdf'))
    await accounts.setStatementDate(monthsAgo(5))

    await expect(accounts.uploadDialog.getByTestId(QA.statementDateHint)).toContainText(
      'older than 3 months, so it won’t count',
    )
    await accounts.saveStatement()

    await expect(accounts.uploadDialog).toBeHidden()
    await accounts.expectStatus('HSBC', 'Outdated')
    await accounts.expectReady(2, 4)
  })

  test('checks the file and date before sending anything', async ({ accounts }) => {
    await accounts.goto()
    await accounts.openUpload('HSBC')
    const fileHint = accounts.uploadDialog.getByTestId(QA.statementFileHint)
    await expect(fileHint).toHaveText('PDF, PNG or JPEG, up to 10 MB.')

    await accounts.saveStatement()
    await expect(fileHint).toHaveText('Choose a statement file')

    await accounts.chooseFile({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('not a statement') })
    await accounts.saveStatement()
    await expect(fileHint).toHaveText('Upload a PDF, PNG or JPEG file')

    await accounts.chooseFile(pdfFile('hsbc.pdf'))
    await accounts.setStatementDate(daysFromNow(3))
    await accounts.saveStatement()
    await expect(accounts.uploadDialog.getByTestId(QA.statementDateHint)).toHaveText(
      'Statement date cannot be in the future',
    )

    await accounts.uploadDialog.getByTestId(QA.uploadCancelButton).click()
    await accounts.expectStatus('HSBC', 'Missing')
  })

  test('opens an uploaded statement in a new tab', async ({ accounts, page }) => {
    const file = pngFile('hsbc_scan.png')
    await accounts.goto()
    await accounts.uploadStatement('HSBC', file)

    const popupOpened = page.waitForEvent('popup')
    await accounts.row('HSBC').getByTestId(QA.accountStatementLink).click()
    const popup = await popupOpened

    // The app fetches the file through the API and shows it from memory.
    await popup.waitForURL(/^blob:/)
    const shownBytes = await popup.evaluate(async () => (await (await fetch(location.href)).arrayBuffer()).byteLength)
    expect(shownBytes).toBe(file.buffer.length)
  })
})

test.describe('The server enforces the upload rules, even around the screen', () => {
  test('refuses a file that is not a PDF, PNG or JPEG', async ({ api }) => {
    const res = await api.uploadStatement('HSBC', { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('x') })
    expect(res.status()).toBe(400)
    expect(await res.json()).toEqual({ message: 'Upload a PDF, PNG or JPEG file' })
  })

  test('refuses a file over 10 MB', async ({ api }) => {
    const res = await api.uploadStatement('HSBC', pdfFile('huge.pdf', 'x'.repeat(10 * 1024 * 1024 + 1)))
    expect(res.status()).toBe(400)
    expect(await res.json()).toEqual({ message: 'The file must be 10 MB or smaller' })
  })

  test('refuses a statement dated in the future', async ({ api }) => {
    const res = await api.uploadStatement('HSBC', pdfFile('hsbc.pdf'), daysFromNow(3))
    expect(res.status()).toBe(400)
    expect(await res.json()).toEqual({ message: 'Statement date cannot be in the future' })
  })
})
