import { expect, QA, SEEDED, test } from './support'

test.describe('Seeing providers', () => {
  test('shows each provider with its status and how close the client is to submitting', async ({ accounts }) => {
    await accounts.goto()

    await accounts.expectProviders(SEEDED)
    await accounts.expectStatus('Barclays', 'Uploaded')
    await accounts.expectStatus('HSBC', 'Missing')
    await expect(accounts.row('HSBC').getByTestId(QA.accountNoStatement)).toHaveText('No statement yet')
    await accounts.expectStatus('Vanguard', 'Outdated')
    await expect(accounts.row('Vanguard').getByTestId(QA.accountOutdatedInfo)).toBeVisible()
    await accounts.expectStatus('Fidelity', 'Uploaded')

    await accounts.expectReady(2, 4)
    await expect(accounts.readinessHint).toHaveText('Still needed: 1 missing, 1 outdated.')
    await expect(accounts.submitButton).toBeDisabled()
  })

  test('filters the list by status', async ({ accounts }) => {
    await accounts.goto()
    await expect(accounts.qa(QA.filter.NEEDS_ATTENTION)).toHaveText('Needs attention 2')

    await accounts.filter('NEEDS_ATTENTION')
    await accounts.expectProviders(['HSBC', 'Vanguard'])

    await accounts.filter('UPLOADED')
    await accounts.expectProviders(['Barclays', 'Fidelity'])

    await accounts.filter('MISSING')
    await accounts.expectProviders(['HSBC'])

    await accounts.filter('OUTDATED')
    await accounts.expectProviders(['Vanguard'])

    await accounts.filter('ALL')
    await accounts.expectProviders(SEEDED)
  })

  test('says when nothing matches a filter, and gets back to everything', async ({ accounts, api }) => {
    await api.removeProvider('HSBC')
    await accounts.goto()

    await accounts.filter('MISSING')
    await expect(accounts.qa(QA.accountsNoMatches)).toContainText('Nothing matches this filter.')
    await accounts.qa(QA.showAllButton).click()
    await accounts.expectProviders(['Barclays', 'Vanguard', 'Fidelity'])
  })

  test('shows an empty state when the client has no providers', async ({ accounts, api, page }) => {
    for (const name of SEEDED) await api.removeProvider(name)
    await page.goto('/')

    await expect(accounts.qa(QA.accountsEmpty)).toHaveText('No providers yet. Add the ones you hold money with.')
    await expect(accounts.readinessHint).toHaveText('Add the providers you hold money with to get started.')
    await expect(accounts.submitButton).toBeDisabled()
  })

  test('shows an error when the list fails to load, and recovers on retry', async ({ accounts, page }) => {
    await page.route('**/api/accounts', (route) => route.fulfill({ status: 503, json: { message: 'Service down' } }))
    await page.goto('/')

    // The app retries a few times before it shows the error.
    await expect(accounts.qa(QA.accountsError)).toContainText('Service down', { timeout: 15_000 })

    await page.unroute('**/api/accounts')
    await accounts.qa(QA.accountsRetryButton).click()
    await accounts.expectProviders(SEEDED)
  })
})

test.describe('Adding providers', () => {
  test('adds several providers at once, searching the known providers', async ({ accounts, page }) => {
    await accounts.goto()
    await accounts.openAddProviders()

    await accounts.searchProviders('av')
    await accounts.providerCheckbox('Aviva').check()
    await accounts.searchProviders('')
    await accounts.providerCheckbox('Monzo').check()
    const confirm = accounts.addDialog.getByTestId(QA.addProvidersConfirmButton)
    await expect(confirm).toHaveText('Add 2 providers')
    await confirm.click()

    await expect(accounts.addDialog).toBeHidden()
    await expect(accounts.toast('Added 2 providers')).toBeVisible()
    await accounts.expectProviders([...SEEDED, 'Aviva', 'Monzo'])
    await accounts.expectStatus('Aviva', 'Missing')
    await accounts.expectStatus('Monzo', 'Missing')
    await accounts.expectReady(2, 6)

    // Saved on the server, not just on screen.
    await page.reload()
    await accounts.expectProviders([...SEEDED, 'Aviva', 'Monzo'])
  })

  test('never offers a provider the client has already added', async ({ accounts }) => {
    await accounts.goto()
    await accounts.openAddProviders()

    await expect(accounts.providerCheckbox('Monzo')).toBeVisible()
    for (const name of SEEDED) await expect(accounts.providerCheckbox(name)).toHaveCount(0)
  })

  test('says when the search matches nothing', async ({ accounts }) => {
    await accounts.goto()
    await accounts.openAddProviders()

    await accounts.searchProviders('zzz')
    await expect(accounts.addDialog.getByTestId(QA.providersEmpty)).toHaveText('No providers match “zzz”.')
    await expect(accounts.addDialog.getByTestId(QA.addProvidersConfirmButton)).toBeDisabled()
  })

  test('the server refuses a provider that was added meanwhile, and the dialog says so', async ({ accounts, api }) => {
    await accounts.goto()
    await accounts.openAddProviders()
    await accounts.providerCheckbox('Monzo').check()

    // e.g. added from another tab while this dialog was open.
    expect((await api.addProviders(['monzo'])).status()).toBe(201)
    await accounts.addDialog.getByTestId(QA.addProvidersConfirmButton).click()

    await expect(accounts.addDialog.getByTestId(QA.addProvidersError)).toHaveText('Already added: Monzo')
    await expect(accounts.addDialog).toBeVisible()
  })
})

test.describe('Removing providers', () => {
  test('removes a provider after confirming', async ({ accounts, page }) => {
    await accounts.goto()

    await accounts.remove('HSBC')

    await expect(accounts.toast('Removed HSBC')).toBeVisible()
    await accounts.expectProviders(['Barclays', 'Vanguard', 'Fidelity'])
    await accounts.expectReady(2, 3)
    await expect(accounts.readinessHint).toHaveText('Still needed: 1 outdated.')

    await page.reload()
    await accounts.expectProviders(['Barclays', 'Vanguard', 'Fidelity'])
  })

  test('keeps the provider when the client cancels', async ({ accounts }) => {
    await accounts.goto()

    await accounts.row('HSBC').getByTestId(QA.accountRemoveButton).click()
    await accounts.row('HSBC').getByTestId(QA.accountCancelRemoveButton).click()

    await accounts.expectProviders(SEEDED)
    await expect(accounts.row('HSBC').getByTestId(QA.accountUploadButton)).toHaveText('Upload')
  })

  test('a removed provider can be added again', async ({ accounts }) => {
    await accounts.goto()
    await accounts.remove('HSBC')
    await accounts.expectProviders(['Barclays', 'Vanguard', 'Fidelity'])

    await accounts.openAddProviders()
    await accounts.providerCheckbox('HSBC').check()
    await accounts.addDialog.getByTestId(QA.addProvidersConfirmButton).click()

    await accounts.expectProviders(['Barclays', 'Vanguard', 'Fidelity', 'HSBC'])
    await accounts.expectStatus('HSBC', 'Missing')
  })
})
