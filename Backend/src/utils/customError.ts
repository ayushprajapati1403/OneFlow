import STATUS_CODES from 'http-status-codes'
import errorCode from './errorCode'

// Map error types to HTTP status codes
const ERROR_TYPE_TO_STATUS_CODE: Record<string, number> = {
  NOT_FOUND: STATUS_CODES.NOT_FOUND, // 404
  BAD_REQUEST: STATUS_CODES.BAD_REQUEST, // 400
  UNAUTHORIZED: STATUS_CODES.UNAUTHORIZED, // 401
  FORBIDDEN: STATUS_CODES.FORBIDDEN, // 403
  CONFLICT: STATUS_CODES.CONFLICT, // 409
  INTERNAL_SERVER_ERROR: STATUS_CODES.INTERNAL_SERVER_ERROR, // 500
  UNPROCESSABLE_ENTITY: STATUS_CODES.UNPROCESSABLE_ENTITY // 422
}

class CustomError extends Error {
  public error: [string, ...string[]]
  public statusCode: any
  public data: any
  public code: any

  constructor(error: any, statusCode?: any, data?: any, code?: any) {
    // Pass remaining arguments (including vendor specific ones) to parent constructor
    super()

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CustomError)
    }

    this.name = 'CustomError'

    // Handle both old usage pattern and new pattern
    // Old: CustomError('NOT_FOUND', ['message']) - error type as string, messages as array
    // New: CustomError(['message'], 404) - messages as array, status code as number
    if (typeof error === 'string' && Array.isArray(statusCode)) {
      // Old pattern: error is type string, statusCode is actually messages array
      this.error = statusCode as [string, ...string[]]
      this.statusCode = ERROR_TYPE_TO_STATUS_CODE[error] || STATUS_CODES.PRECONDITION_FAILED
    } else {
      // New pattern: error is messages, statusCode is number
      this.error = Array.isArray(error) ? (error as [string, ...string[]]) : [error as string]
      this.statusCode = typeof statusCode === 'number' && statusCode > 0 ? statusCode : STATUS_CODES.PRECONDITION_FAILED
    }

    this.data = data || {}
    this.code = code || errorCode.error
  }
}

export default CustomError
