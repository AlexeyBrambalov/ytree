import type { StatusFilter } from '../domain/readiness'

/**
 * `data-qa` tags for the e2e tests (../../e2e). Components set them and tests find elements by them
 * (Playwright's `getByTestId`, configured to read `data-qa`), so both sides share these constants
 * and a renamed tag can't silently break a test.
 */
export const QA = {
  // Readiness header
  readinessCount: 'readiness-count',
  readinessProgress: 'readiness-progress',

  // Account list and its states
  accountsList: 'accounts-list',
  accountsLoading: 'accounts-loading',
  accountsError: 'accounts-error',
  accountsRetryButton: 'accounts-retry-button',
  accountsEmpty: 'accounts-empty',
  accountsNoMatches: 'accounts-no-matches',
  showAllButton: 'show-all-button',
  addProviderButton: 'add-provider-button',

  // One account row
  accountRow: 'account-row',
  accountProviderName: 'account-provider-name',
  accountStatus: 'account-status',
  accountStatementLink: 'account-statement-link',
  accountNoStatement: 'account-no-statement',
  accountStatementDate: 'account-statement-date',
  accountOutdatedInfo: 'account-outdated-info',
  accountUploadButton: 'account-upload-button',
  accountRemoveButton: 'account-remove-button',
  accountConfirmRemoveButton: 'account-confirm-remove-button',
  accountCancelRemoveButton: 'account-cancel-remove-button',

  // Status filters, one per filter
  filter: {
    ALL: 'filter-all',
    NEEDS_ATTENTION: 'filter-needs-attention',
    MISSING: 'filter-missing',
    UPLOADED: 'filter-uploaded',
    OUTDATED: 'filter-outdated',
  } satisfies Record<StatusFilter, string>,

  // Submit
  readinessHint: 'readiness-hint',
  submitButton: 'submit-button',
  submissionProblems: 'submission-problems',
  submissionError: 'submission-error',
  submittedConfirmation: 'submitted-confirmation',

  // Any dialog
  dialogTitle: 'dialog-title',
  dialogDescription: 'dialog-description',

  // "Add providers" dialog
  addProvidersDialog: 'add-providers-dialog',
  providerSearch: 'provider-search',
  providerOption: 'provider-option',
  providerOptionName: 'provider-option-name',
  providerCheckbox: 'provider-checkbox',
  providersEmpty: 'providers-empty',
  addProvidersError: 'add-providers-error',
  addProvidersConfirmButton: 'add-providers-confirm-button',
  addProvidersCancelButton: 'add-providers-cancel-button',

  // "Upload statement" dialog
  uploadDialog: 'upload-dialog',
  statementFileInput: 'statement-file-input',
  statementFileHint: 'statement-file-hint',
  statementDateInput: 'statement-date-input',
  statementDateHint: 'statement-date-hint',
  uploadError: 'upload-error',
  uploadSaveButton: 'upload-save-button',
  uploadCancelButton: 'upload-cancel-button',

  // Toasts
  toast: 'toast',
} as const
