import { NextFunction } from 'express'
import STATUS_CODES from 'http-status-codes'
import { CustomRequest, CustomResponse, CustomSocket } from '../environment'
import { createResponse, verifyJWTToken } from '../utils/helper'
import { logger } from '../utils/logger'
import { isEmpty } from '../utils/validator'

class Authorization {
  /**
   * @description Route Authorization for status check
   * @param {Object} req
   * @param {Object} res
   * @param {Object} next
   */
  async isProtectedRouteAuthorized(req: CustomRequest, res: CustomResponse, next: NextFunction) {
    try {
      const { authorization } = req.headers
      if (isEmpty(authorization)) {
        return createResponse(res, STATUS_CODES.UNPROCESSABLE_ENTITY, 'Authorization Token is required.')
      } else if (authorization) {
        try {
          const tokenData: any = verifyJWTToken(authorization.split(' ').pop())
          req.user = tokenData
        } catch (error: any) {
          logger.error(__filename, 'isAuthorized', '', 'Invalid Authorized token', error) // Log
          return createResponse(res, 411, error.message)
        }

        // if (response.status === STATUS_CODES.OK) {
        //   req.custom.keycloak_uuid = response.data.sub
        //   req.custom.first_name = response.data.given_name
        //   req.custom.last_name = response.data.family_name
        //   req.custom.email = response.data.email
        // } else {
        //   logger.error(__filename, 'Unauthorized', req.custom.request_uuid, res.__('SERVER_ERROR_MESSAGE'), {})
        //   return createResponse(res, response.status, response.data)
        // }

        next()
      }
    } catch (err: any) {
      logger.error(__filename, 'isAuthorized', '', 'status Check error', err) // Log
      return createResponse(res, STATUS_CODES.INTERNAL_SERVER_ERROR, `Server Error`)
    }
  }

  requireRoles(...roles: string[]) {
    return (req: CustomRequest, res: CustomResponse, next: NextFunction) => {
      const userRole = req.user?.role
      if (!userRole || !roles.includes(userRole)) {
        return createResponse(res, STATUS_CODES.FORBIDDEN, res.__('AUTH.INSUFFICIENT_PERMISSIONS'))
      }
      return next()
    }
  }

  /**
   * @description Socket Authorization for authorization check
   * @param {Object} socket
   * @param {Object} next
   */
  public async isAuthorizedSocket(socket: CustomSocket, next: any) {
    try {
      const authorization = socket?.handshake?.auth?.token || socket?.handshake?.headers?.auth // for ios

      // const token = socket.handshake.auth?.token;
      socket.users = await verifyJWTToken(authorization)

      next()
    } catch (e) {
      logger.error(__filename, 'isAuthorizedSocket', '', 'socket check auth token error', e)
      // next(new Error(__('SERVER_ERROR_MESSAGE')));
      return next(new Error('Invalid token'))
    }
  }
}

const middlewareObj = new Authorization()
export default middlewareObj
