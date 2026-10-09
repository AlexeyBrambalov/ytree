import { expect, monthsAgo, pdfFile, QA, SEEDED, test } from './support'

test.describe('Submitting', () => {
  test('submits once every provider has a current statement', async ({ accounts }) => {
    await accounts.goto()
    await expect(accounts.submitButton).toBeDisabled()
    await expect(accounts.readinessHint).toHaveText('Still needed: 1 missing, 1 outdated.')

    await accounts.uploadStatement('HSBC', pdfFile('hsbc.pdf'))
    await accounts.expectReady(3, 4)
    await expect(accounts.readinessHint).toHaveText('Still needed: 1 outdated.')
    await expect(accounts.submitButton).toBeDisabled()

    await accounts.uploadStatement('Vanguard', pdfFile('vanguard.pdf'))
    await accounts.expectReady(4, 4)
    await expect(accounts.readinessHint).toHaveText('Everything is in order — you can submit.')
    await expect(accounts.submitButton).toBeEnabled()

    await accounts.submitButton.click()
    await expect(accounts.qa(QA.submittedConfirmation)).toContainText('Statements submitted')
  })

  test('refuses a submission that went stale behind the screen, says why, and accepts it once fixed', async ({
    accounts,
    api,
  }) => {
    await api.uploadStatement('HSBC', pdfFile('hsbc.pdf'))
    await api.uploadStatement('Vanguard', pdfFile('vanguard.pdf'))
    await accounts.goto()
    await expect(accounts.submitButton).toBeEnabled()

    // e.g. another tab replaced Barclays' statement with an old one: this screen is now out of date.
    await api.uploadStatement('Barclays', pdfFile('barclays_old.pdf'), monthsAgo(5))
    await accounts.submitButton.click()

    const problems = accounts.qa(QA.submissionProblems)
    await expect(problems).toContainText('We couldn’t accept your submission yet')
    await expect(problems).toContainText('Barclays — statement outdated (older than 3 months)')
    await accounts.expectStatus('Barclays', 'Outdated') // the screen refreshes to match the server
    await expect(accounts.submitButton).toBeDisabled()

    await accounts.uploadStatement('Barclays', pdfFile('barclays_new.pdf'))
    await expect(problems).toBeHidden() // the problem clears once fixed
    await accounts.submitButton.click()
    await expect(accounts.qa(QA.submittedConfirmation)).toContainText('Statements submitted')
  })
})

test.describe('The server refuses an incomplete set, even around the screen', () => {
  test('lists every provider that is missing or outdated', async ({ api }) => {
    const res = await api.submit()

    expect(res.status()).toBe(422)
    expect(await res.json()).toEqual({
      message: 'Some providers still need a current statement.',
      problems: [
        { accountId: await api.accountId('HSBC'), providerName: 'HSBC', reason: 'MISSING' },
        { accountId: await api.accountId('Vanguard'), providerName: 'Vanguard', reason: 'OUTDATED' },
      ],
    })
  })

  test('refuses a submission with no providers', async ({ api }) => {
    for (const name of SEEDED) await api.removeProvider(name)

    const res = await api.submit()

    expect(res.status()).toBe(422)
    expect((await res.json()).problems).toEqual([{ accountId: null, providerName: null, reason: 'NO_ACCOUNTS' }])
  })

  test('accepts a complete set', async ({ api }) => {
    await api.uploadStatement('HSBC', pdfFile('hsbc.pdf'))
    await api.uploadStatement('Vanguard', pdfFile('vanguard.pdf'))

    const res = await api.submit()

    expect(res.status()).toBe(200)
    expect((await res.json()).submittedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })
})
