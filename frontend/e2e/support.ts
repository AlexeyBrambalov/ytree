import { test as base, expect, type APIRequestContext, type Locator, type Page } from '@playwright/test'
import { E2E_API_URL } from '../playwright.config'
import type { StatusFilter } from '../src/domain/readiness'
import { QA } from '../src/helpers/qa'

// ---- Test data ----

export interface StatementFile {
  name: string
  mimeType: string
  buffer: Buffer
}

export const pdfFile = (name: string, content = '%PDF-1.4 e2e statement'): StatementFile => ({
  name,
  mimeType: 'application/pdf',
  buffer: Buffer.from(content),
})

/** A real 1×1 PNG. Images open in a headless browser tab; PDFs would download instead. */
export const pngFile = (name: string): StatementFile => ({
  name,
  mimeType: 'image/png',
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64',
  ),
})

const isoDate = (date: Date) => date.toISOString().slice(0, 10)

export const today = () => isoDate(new Date())

export function monthsAgo(months: number): string {
  const date = new Date()
  date.setUTCMonth(date.getUTCMonth() - months)
  return isoDate(date)
}

export function daysFromNow(days: number): string {
  return isoDate(new Date(Date.now() + days * 86_400_000))
}

// ---- The backend, called directly: to arrange state and to go around the screen ----

/** The demo data every test starts from (see backend DemoData.kt). */
export const SEEDED = ['Barclays', 'HSBC', 'Vanguard', 'Fidelity']

export class BackendApi {
  constructor(private readonly request: APIRequestContext) {}

  /** Back to the demo data. Only exists when the backend runs with the `e2e` profile. */
  async reset() {
    const res = await this.request.post(`${E2E_API_URL}/api/e2e/reset`)
    expect(res.status(), 'reset the backend (is it running with the e2e profile?)').toBe(204)
  }

  async accountId(providerName: string): Promise<string> {
    const res = await this.request.get(`${E2E_API_URL}/api/accounts`)
    const accounts: Array<{ id: string; provider: { name: string } }> = await res.json()
    const account = accounts.find((a) => a.provider.name === providerName)
    if (!account) throw new Error(`No account for ${providerName}`)
    return account.id
  }

  addProviders(providerIds: string[]) {
    return this.request.post(`${E2E_API_URL}/api/accounts`, { data: { providerIds } })
  }

  async removeProvider(providerName: string) {
    return this.request.delete(`${E2E_API_URL}/api/accounts/${await this.accountId(providerName)}`)
  }

  async uploadStatement(providerName: string, file: StatementFile, statementDate = today()) {
    const id = await this.accountId(providerName)
    return this.request.put(`${E2E_API_URL}/api/accounts/${id}/statement`, {
      multipart: { file, statementDate },
    })
  }

  submit() {
    return this.request.post(`${E2E_API_URL}/api/submission`)
  }
}

// ---- The screen, as the client sees it. Elements are found only by their `data-qa` tags. ----

/** Matches an element whose whole text is exactly `text`. */
const exactly = (text: string) => new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`)

export type StatusLabel = 'Missing' | 'Uploaded' | 'Outdated'

export class AccountsPage {
  constructor(readonly page: Page) {}

  async goto() {
    await this.page.goto('/')
    await expect(this.qa(QA.accountsList)).toBeVisible()
  }

  /** The element with this `data-qa` tag. */
  qa(tag: string): Locator {
    return this.page.getByTestId(tag)
  }

  row(providerName: string): Locator {
    return this.qa(QA.accountRow).filter({
      has: this.qa(QA.accountProviderName).filter({ hasText: exactly(providerName) }),
    })
  }

  get addDialog() {
    return this.qa(QA.addProvidersDialog)
  }

  get uploadDialog() {
    return this.qa(QA.uploadDialog)
  }

  get submitButton() {
    return this.qa(QA.submitButton)
  }

  get readinessHint() {
    return this.qa(QA.readinessHint)
  }

  toast(message: string): Locator {
    return this.qa(QA.toast).filter({ hasText: message })
  }

  /** The list shows exactly these providers, in this order. */
  async expectProviders(names: string[]) {
    await expect(this.qa(QA.accountProviderName)).toHaveText(names)
  }

  async expectStatus(providerName: string, status: StatusLabel) {
    await expect(this.row(providerName).getByTestId(QA.accountStatus)).toHaveText(status)
  }

  async expectReady(ready: number, total: number) {
    await expect(this.qa(QA.readinessCount)).toHaveText(`${ready} of ${total} ready`)
    await expect(this.qa(QA.readinessProgress)).toHaveAttribute('aria-valuenow', String(ready))
  }

  async filter(filter: StatusFilter) {
    await this.qa(QA.filter[filter]).click()
    await expect(this.qa(QA.filter[filter])).toHaveAttribute('aria-pressed', 'true')
  }

  async openAddProviders() {
    await this.qa(QA.addProviderButton).click()
    await expect(this.addDialog).toBeVisible()
  }

  /** The checkbox for a provider in the "Add providers" dialog. */
  providerCheckbox(providerName: string): Locator {
    return this.addDialog
      .getByTestId(QA.providerOption)
      .filter({ has: this.qa(QA.providerOptionName).filter({ hasText: exactly(providerName) }) })
      .getByTestId(QA.providerCheckbox)
  }

  async searchProviders(query: string) {
    await this.addDialog.getByTestId(QA.providerSearch).fill(query)
  }

  /** Opens the upload dialog from the row's Upload or Replace button. */
  async openUpload(providerName: string) {
    await this.row(providerName).getByTestId(QA.accountUploadButton).click()
    await expect(this.uploadDialog).toBeVisible()
  }

  async chooseFile(file: StatementFile) {
    await this.uploadDialog.getByTestId(QA.statementFileInput).setInputFiles(file)
  }

  async setStatementDate(date: string) {
    await this.uploadDialog.getByTestId(QA.statementDateInput).fill(date)
  }

  async saveStatement() {
    await this.uploadDialog.getByTestId(QA.uploadSaveButton).click()
  }

  async uploadStatement(providerName: string, file: StatementFile, statementDate?: string) {
    await this.openUpload(providerName)
    await this.chooseFile(file)
    if (statementDate) await this.setStatementDate(statementDate)
    await this.saveStatement()
    await expect(this.uploadDialog).toBeHidden()
  }

  async remove(providerName: string) {
    await this.row(providerName).getByTestId(QA.accountRemoveButton).click()
    await this.row(providerName).getByTestId(QA.accountConfirmRemoveButton).click()
  }
}

// ---- Fixtures: the screen and the API, and a freshly reset backend before every test ----

export const test = base.extend<{ api: BackendApi; accounts: AccountsPage; resetBackend: void }>({
  api: async ({ request }, use) => use(new BackendApi(request)),
  accounts: async ({ page }, use) => use(new AccountsPage(page)),
  resetBackend: [
    async ({ api }, use) => {
      await api.reset()
      await use()
    },
    { auto: true },
  ],
})

export { expect, QA }
