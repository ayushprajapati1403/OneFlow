class ServiceError extends Error {
  public error: any
  public data: any

  constructor(error: string, data: any = {}, ...params: any) {
    // Pass remaining arguments (including vendor specific ones) to parent constructor
    super(...params)

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ServiceError)
    }

    this.name = 'ServiceError'

    this.error = error
    this.data = data
  }
}

export default ServiceError
