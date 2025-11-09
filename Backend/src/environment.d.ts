import { Request, Response } from 'express'

declare namespace Environment {
  /**
   * Custom request that includes all the types of express Request Object
   */
  interface CustomRequest extends Request {
    user?: {
      id: number
      email: string
      role: string
      company_id?: number
    }
    custom?: CustomRequestObject
  }

  /**
   * Custom response that includes all the types of express Response Object
   */
  interface CustomResponse extends Response {
    body?: object
  }

  /**
   * Order by object type
   */
  interface Order {
    orderBy: any
    sortField?: string
    sort_field?: string
  }

  /**
   * Pager
   */
  interface Pager {
    sortField: string
    sortOrder: string
    rowNumber: number
    recordsPerPage: number
    filteredRecords: number
    totalRecords: number
  }
  interface AxiosResponse {
    data: any
    body: { [x: string]: string }
  }

  interface CustomSocket extends Socket {
    handshake: any
    users?: any
    files?: any
    sessionId?: any
  }
}

export = Environment
