import { CustomRequest, CustomResponse } from '../../environment'
import STATUS_CODES from 'http-status-codes'
import { logger } from '../logger'
import { createResponse /* , getErrorEmailBody */ } from '../helper'
// import moment from 'moment'

class ErrorHandling {
  async serverError(req: CustomRequest, res: CustomResponse, fileName: string, method: string, uuid: string, msg: string, data: any = {}) {
    /* if (process.env.SEND_ERROR_EMAIL === 'true') {
      const errorData = {
        apiUrl: req.originalUrl,
        xTraceId: req.headers['x-trace-id'] ?? 'N/A',
        user_uuid: req?.custom?.decodedTokenData?.uuid ?? 'N/A',
        errorDetails: data,
        request: JSON.stringify({ headers: req.headers, body: req.body, params: req.params, query: req.query }),
        timestamp: moment().unix()
      }
      const fromEmail = process.env.FROM_EMAIL as string
      const toEmail = process.env.TO_EMAIL as string
      getErrorEmailBody(errorData, toEmail, fromEmail)
    } */
    logger.error(fileName, method, uuid, msg, data)
    return createResponse(res, STATUS_CODES.INTERNAL_SERVER_ERROR, data?.message ?? res.__('SERVER_ERROR'))
  }
}

const errorHandlingObj = new ErrorHandling()
export default errorHandlingObj
