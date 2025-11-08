import i18n from 'i18n'
import path from 'path'

/**
 * Configure i18n for internationalization
 * Following TrueAtoms boilerplate pattern
 */
i18n.configure({
  defaultLocale: 'en',
  directory: path.join(__dirname, '../../../locales/'), // JSON file location
  locales: ['en'], // array of locales
  cookie: 'home_planner', // cookie from which locale settings will be parsed
  autoReload: true, // reload locales after change
  objectNotation: true,
  updateFiles: false, // don't update files automatically
  syncFiles: false // don't sync files automatically
})

/**
 * Translation helper function - maintains compatibility with existing code
 * @param key - Translation key
 * @param options - Translation options
 * @returns Translated string
 */
export const t = (key: string, options?: any): string => {
  return i18n.__(key, options)
}

/**
 * Pluralization helper function
 * @param key - Translation key
 * @param count - Count for pluralization
 * @param options - Translation options
 * @returns Translated string
 */
export const tn = (key: string, count: number, options?: any): string => {
  return i18n.__n(`VALIDATIONS.${key}`, count, options)
}

/**
 * Get current language
 * @returns Current language code
 */
export const getCurrentLanguage = (): string => {
  return i18n.getLocale()
}

/**
 * Change language
 * @param lng - Language code to change to
 */
export const changeLanguage = (lng: string): void => {
  i18n.setLocale(lng)
}

/**
 * Get translation with namespace (for backward compatibility)
 * @param namespace - Namespace (e.g., 'auth', 'user')
 * @param key - Translation key
 * @param options - Translation options
 * @returns Translated string
 */
export const translate = (namespace: string, key: string, options?: any): string => {
  return i18n.__(`${namespace}.${key}`, options)
}

/**
 * Get error message by error code
 * @param errorCode - Error code
 * @param options - Translation options
 * @returns Translated error message
 */
export const getErrorMessage = (errorCode: string, options?: any): string => {
  return i18n.__(`errors.${errorCode}`, options)
}

/**
 * Get validation message by validation type
 * @param validationType - Validation type
 * @param options - Translation options
 * @returns Translated validation message
 */
export const getValidationMessage = (validationType: string, options?: any): string => {
  return i18n.__(`VALIDATIONS.${validationType}`, options)
}

/**
 * Get auth message
 * @param messageKey - Message key
 * @param options - Translation options
 * @returns Translated auth message
 */
export const getAuthMessage = (messageKey: string, options?: any): string => {
  return i18n.__(`auth.${messageKey}`, options)
}

/**
 * Get user message
 * @param messageKey - Message key
 * @param options - Translation options
 * @returns Translated user message
 */
export const getUserMessage = (messageKey: string, options?: any): string => {
  return i18n.__(`user.${messageKey}`, options)
}

/**
 * Get common message
 * @param messageKey - Message key
 * @param options - Translation options
 * @returns Translated common message
 */
export const getCommonMessage = (messageKey: string, options?: any): string => {
  return i18n.__(`common.${messageKey}`, options)
}

/**
 * Get company message
 * @param messageKey - Message key
 * @param options - Translation options
 * @returns Translated company message
 */
export const getCompanyMessage = (messageKey: string, options?: any): string => {
  return i18n.__(`company.${messageKey}`, options)
}

/**
 * Get subscription message
 * @param messageKey - Message key
 * @param options - Translation options
 * @returns Translated subscription message
 */
export const getSubscriptionMessage = (messageKey: string, options?: any): string => {
  return i18n.__(`subscription.${messageKey}`, options)
}

/**
 * Get appointment message
 * @param messageKey - Message key
 * @param options - Translation options
 * @returns Translated appointment message
 */
export const getAppointmentMessage = (messageKey: string, options?: any): string => {
  return i18n.__(`appointment.${messageKey}`, options)
}

/**
 * Get customer message
 * @param messageKey - Message key
 * @param options - Translation options
 * @returns Translated customer message
 */
export const getCustomerMessage = (messageKey: string, options?: any): string => {
  return i18n.__(`customer.${messageKey}`, options)
}

/**
 * Get service message
 * @param messageKey - Message key
 * @param options - Translation options
 * @returns Translated service message
 */
export const getServiceMessage = (messageKey: string, options?: any): string => {
  return i18n.__(`service.${messageKey}`, options)
}

/**
 * Get product message
 * @param messageKey - Message key
 * @param options - Translation options
 * @returns Translated product message
 */
export const getProductMessage = (messageKey: string, options?: any): string => {
  return i18n.__(`product.${messageKey}`, options)
}

/**
 * Get invoice message
 * @param messageKey - Message key
 * @param options - Translation options
 * @returns Translated invoice message
 */
export const getInvoiceMessage = (messageKey: string, options?: any): string => {
  return i18n.__(`invoice.${messageKey}`, options)
}

/**
 * Get payment message
 * @param messageKey - Message key
 * @param options - Translation options
 * @returns Translated payment message
 */
export const getPaymentMessage = (messageKey: string, options?: any): string => {
  return i18n.__(`payment.${messageKey}`, options)
}

/**
 * Get organization message
 * @param messageKey - Message key
 * @param options - Translation options
 * @returns Translated organization message
 */
export const getOrganizationMessage = (messageKey: string, options?: any): string => {
  return i18n.__(`organization.${messageKey}`, options)
}

/**
 * Get branch message
 * @param messageKey - Message key
 * @param options - Translation options
 * @returns Translated branch message
 */
export const getBranchMessage = (messageKey: string, options?: any): string => {
  return i18n.__(`branch.${messageKey}`, options)
}

/**
 * Get room message
 * @param messageKey - Message key
 * @param options - Translation options
 * @returns Translated room message
 */
export const getRoomMessage = (messageKey: string, options?: any): string => {
  return i18n.__(`room.${messageKey}`, options)
}

/**
 * Get role message
 * @param messageKey - Message key
 * @param options - Translation options
 * @returns Translated role message
 */
export const getRoleMessage = (messageKey: string, options?: any): string => {
  return i18n.__(`role.${messageKey}`, options)
}

/**
 * Get file message
 * @param messageKey - Message key
 * @param options - Translation options
 * @returns Translated file message
 */
export const getFileMessage = (messageKey: string, options?: any): string => {
  return i18n.__(`file.${messageKey}`, options)
}

/**
 * Get notification message
 * @param messageKey - Message key
 * @param options - Translation options
 * @returns Translated notification message
 */
export const getNotificationMessage = (messageKey: string, options?: any): string => {
  return i18n.__(`notification.${messageKey}`, options)
}

/**
 * Get report message
 * @param messageKey - Message key
 * @param options - Translation options
 * @returns Translated report message
 */
export const getReportMessage = (messageKey: string, options?: any): string => {
  return i18n.__(`report.${messageKey}`, options)
}

/**
 * Get settings message
 * @param messageKey - Message key
 * @param options - Translation options
 * @returns Translated settings message
 */
export const getSettingsMessage = (messageKey: string, options?: any): string => {
  return i18n.__(`settings.${messageKey}`, options)
}

/**
 * Initialize i18n middleware
 * This function should be called in the middleware chain
 */
export const initI18n = () => {
  return i18n.init
}

// Export the main i18n instance for backward compatibility
export { i18n }
export default i18n
