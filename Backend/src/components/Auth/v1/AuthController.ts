import STATUS_CODES from 'http-status-codes'
import { CustomRequest, CustomResponse } from '../../../environment'
import { createResponse, createResponse1 } from '../../../utils/helper'
import { logger } from '../../../utils/logger'
import authModel from '../model/AuthModel'
import AuthHelper from './AuthHelper'
import { ROLE_TYPES } from '../../../utils/constants'
import AuthSchema from '../schema/AuthSchema'

const ADMIN_ROLES = [ROLE_TYPES.ADMIN] as const
type RoleType = (typeof ROLE_TYPES)[keyof typeof ROLE_TYPES]

class AuthController {
  private sanitize(user: AuthSchema) {
    return AuthHelper.sanitizeUser(user)
  }

  private isAdminRole(role?: string): role is (typeof ADMIN_ROLES)[number] {
    return !!role && ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number])
  }

  private normalizeRole(role?: string): RoleType | undefined {
    if (typeof role !== 'string') return undefined
    const normalized = role.toLowerCase() as RoleType
    const allowedRoles = Object.values(ROLE_TYPES) as RoleType[]
    return allowedRoles.includes(normalized) ? normalized : undefined
  }

  async signUp(req: CustomRequest, res: CustomResponse) {
    try {
      const { name, email, password, role, hourly_rate } = req.body

      const existing = await authModel.findByEmail(email)
      if (existing) {
        return createResponse1({ res, status: STATUS_CODES.CONFLICT, message: res.__('AUTH.EMAIL_EXISTS') })
      }

      const { count } = await authModel.listUsers({ limit: 1 })
      const normalizedRole = this.normalizeRole(role)
      const assignedRole: RoleType = count === 0 ? ROLE_TYPES.ADMIN : normalizedRole ?? ROLE_TYPES.TEAM_MEMBER

      if (count > 0 && !this.isAdminRole(req.user?.role)) {
        return createResponse1({ res, status: STATUS_CODES.FORBIDDEN, message: res.__('AUTH.ONLY_ADMIN_CREATE') })
      }

      const user = await authModel.createUser({
        name,
        email,
        password_hash: password,
        role: assignedRole,
        hourly_rate: hourly_rate ?? 0
      })

      const token = AuthHelper.generateAccessToken(user)

      return createResponse(res, STATUS_CODES.CREATED, res.__('AUTH.SIGNUP_SUCCESS'), {
        token,
        user: this.sanitize(user)
      })
    } catch (error) {
      logger.error(__filename, 'signUp', req.custom?.request_uuid, 'Error during sign up', error)
      return createResponse1({ res, status: STATUS_CODES.INTERNAL_SERVER_ERROR, message: res.__('SERVER_ERROR_MESSAGE') })
    }
  }

  async signIn(req: CustomRequest, res: CustomResponse) {
    try {
      const { email, password } = req.body

      const user = await authModel.findByEmail(email)
      if (!user) {
        return createResponse1({ res, status: STATUS_CODES.UNAUTHORIZED, message: res.__('AUTH.INVALID_CREDENTIALS') })
      }

      const valid = await user.comparePassword(password)
      if (!valid) {
        return createResponse1({ res, status: STATUS_CODES.UNAUTHORIZED, message: res.__('AUTH.INVALID_CREDENTIALS') })
      }

      const token = AuthHelper.generateAccessToken(user)

      return createResponse(res, STATUS_CODES.OK, res.__('AUTH.LOGIN_SUCCESS'), {
        token,
        user: this.sanitize(user)
      })
    } catch (error) {
      logger.error(__filename, 'signIn', req.custom?.request_uuid, 'Error during login', error)
      return createResponse1({ res, status: STATUS_CODES.INTERNAL_SERVER_ERROR, message: res.__('SERVER_ERROR_MESSAGE') })
    }
  }

  async me(req: CustomRequest, res: CustomResponse) {
    try {
      const id = req.user?.id
      if (!id) {
        return createResponse1({ res, status: STATUS_CODES.UNAUTHORIZED, message: res.__('AUTH.NOT_AUTHENTICATED') })
      }

      const user = await authModel.findById(id)
      if (!user) {
        return createResponse1({ res, status: STATUS_CODES.NOT_FOUND, message: res.__('AUTH.USER_NOT_FOUND') })
      }

      return createResponse(res, STATUS_CODES.OK, res.__('AUTH.PROFILE_RETRIEVED'), {
        user: this.sanitize(user)
      })
    } catch (error) {
      logger.error(__filename, 'me', req.custom?.request_uuid, 'Error fetching profile', error)
      return createResponse1({ res, status: STATUS_CODES.INTERNAL_SERVER_ERROR, message: res.__('SERVER_ERROR_MESSAGE') })
    }
  }

  async listUsers(req: CustomRequest, res: CustomResponse) {
    try {
      const page = Number(req.query.page ?? 1)
      const limit = Number(req.query.limit ?? 20)
      const offset = (page - 1) * limit

      const { rows, count } = await authModel.listUsers({
        search: req.query.search as string,
        limit,
        offset
      })

      return createResponse(res, STATUS_CODES.OK, res.__('AUTH.USER_LIST'), {
        users: rows.map((row) => this.sanitize(row)),
        pagination: {
          total: count,
          page,
          limit
        }
      })
    } catch (error) {
      logger.error(__filename, 'listUsers', req.custom?.request_uuid, 'Error listing users', error)
      return createResponse1({ res, status: STATUS_CODES.INTERNAL_SERVER_ERROR, message: res.__('SERVER_ERROR_MESSAGE') })
    }
  }

  async getUser(req: CustomRequest, res: CustomResponse) {
    try {
      const id = Number(req.params.id)
      const user = await authModel.findById(id)

      if (!user) {
        return createResponse1({ res, status: STATUS_CODES.NOT_FOUND, message: res.__('AUTH.USER_NOT_FOUND') })
      }

      return createResponse(res, STATUS_CODES.OK, res.__('AUTH.USER_DETAILS'), this.sanitize(user))
    } catch (error) {
      logger.error(__filename, 'getUser', req.custom?.request_uuid, 'Error fetching user', error)
      return createResponse1({ res, status: STATUS_CODES.INTERNAL_SERVER_ERROR, message: res.__('SERVER_ERROR_MESSAGE') })
    }
  }

  async createUser(req: CustomRequest, res: CustomResponse) {
    try {
      const { name, email, password, role, hourly_rate } = req.body

      const existing = await authModel.findByEmail(email)
      if (existing) {
        return createResponse1({ res, status: STATUS_CODES.CONFLICT, message: res.__('AUTH.EMAIL_EXISTS') })
      }

      const assignedRole = this.normalizeRole(role) ?? ROLE_TYPES.TEAM_MEMBER

      const user = await authModel.createUser({
        name,
        email,
        password_hash: password,
        role: assignedRole,
        hourly_rate: hourly_rate ?? 0
      })

      return createResponse(res, STATUS_CODES.CREATED, res.__('AUTH.USER_CREATED'), this.sanitize(user))
    } catch (error) {
      logger.error(__filename, 'createUser', req.custom?.request_uuid, 'Error creating user', error)
      return createResponse1({ res, status: STATUS_CODES.INTERNAL_SERVER_ERROR, message: res.__('SERVER_ERROR_MESSAGE') })
    }
  }

  async updateUser(req: CustomRequest, res: CustomResponse) {
    try {
      const id = Number(req.params.id)
      const { name, email, role, hourly_rate, password } = req.body

      const user = await authModel.findById(id)
      if (!user) {
        return createResponse1({ res, status: STATUS_CODES.NOT_FOUND, message: res.__('AUTH.USER_NOT_FOUND') })
      }

      if (email && email !== user.email) {
        const existing = await authModel.findByEmail(email)
        if (existing) {
          return createResponse1({ res, status: STATUS_CODES.CONFLICT, message: res.__('AUTH.EMAIL_EXISTS') })
        }
      }

      const updated = await authModel.updateById(id, {
        name,
        email,
        role: this.normalizeRole(role),
        hourly_rate,
        ...(password ? { password_hash: password } : {})
      })

      if (!updated) {
        return createResponse1({ res, status: STATUS_CODES.NOT_FOUND, message: res.__('AUTH.USER_NOT_FOUND') })
      }

      return createResponse(res, STATUS_CODES.OK, res.__('AUTH.USER_UPDATED'), this.sanitize(updated))
    } catch (error) {
      logger.error(__filename, 'updateUser', req.custom?.request_uuid, 'Error updating user', error)
      return createResponse1({ res, status: STATUS_CODES.INTERNAL_SERVER_ERROR, message: res.__('SERVER_ERROR_MESSAGE') })
    }
  }

  async deleteUser(req: CustomRequest, res: CustomResponse) {
    try {
      const id = Number(req.params.id)
      if (req.user?.id === id) {
        return createResponse1({ res, status: STATUS_CODES.BAD_REQUEST, message: res.__('AUTH.CANNOT_DELETE_SELF') })
      }

      const deleted = await authModel.deleteById(id)
      if (!deleted) {
        return createResponse1({ res, status: STATUS_CODES.NOT_FOUND, message: res.__('AUTH.USER_NOT_FOUND') })
      }

      return createResponse1({ res, status: STATUS_CODES.OK, message: res.__('AUTH.USER_DELETED') })
    } catch (error) {
      logger.error(__filename, 'deleteUser', req.custom?.request_uuid, 'Error deleting user', error)
      return createResponse1({ res, status: STATUS_CODES.INTERNAL_SERVER_ERROR, message: res.__('SERVER_ERROR_MESSAGE') })
    }
  }

  async changePassword(req: CustomRequest, res: CustomResponse) {
    try {
      const id = req.user?.id
      const { currentPassword, newPassword } = req.body

      if (!id) {
        return createResponse1({ res, status: STATUS_CODES.UNAUTHORIZED, message: res.__('AUTH.NOT_AUTHENTICATED') })
      }

      const user = await authModel.findById(id)
      if (!user) {
        return createResponse1({ res, status: STATUS_CODES.NOT_FOUND, message: res.__('AUTH.USER_NOT_FOUND') })
      }

      const valid = await user.comparePassword(currentPassword)
      if (!valid) {
        return createResponse1({ res, status: STATUS_CODES.UNAUTHORIZED, message: res.__('AUTH.PASSWORD_MISMATCH') })
      }

      await authModel.updateById(id, { password_hash: newPassword })

      return createResponse1({ res, status: STATUS_CODES.OK, message: res.__('AUTH.PASSWORD_UPDATED') })
    } catch (error) {
      logger.error(__filename, 'changePassword', req.custom?.request_uuid, 'Error changing password', error)
      return createResponse1({ res, status: STATUS_CODES.INTERNAL_SERVER_ERROR, message: res.__('SERVER_ERROR_MESSAGE') })
    }
  }
}

export default new AuthController()

