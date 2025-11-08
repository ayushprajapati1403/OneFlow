import { NextFunction, Request, Response } from 'express'
import { createValidationResponse } from '../../../utils/helper'
import { isEmail, isEmpty } from '../../../utils/validator'
import { ROLE_TYPES } from '../../../utils/constants'

const ALLOWED_ROLES = Object.values(ROLE_TYPES)

class AuthValidations {
  private sendErrors(res: Response, errors: Record<string, string>) {
    if (Object.keys(errors).length > 0) {
      createValidationResponse(res, errors)
      return true
    }
    return false
  }

  signUp(req: Request, res: Response, next: NextFunction) {
    const { name, email, password, role } = req.body
    const errors: Record<string, string> = {}

    if (isEmpty(name)) errors.name = res.__('VALIDATIONS.required', 'name')
    if (isEmpty(email)) errors.email = res.__('VALIDATIONS.required', 'email')
    else if (!isEmail(email)) errors.email = res.__('VALIDATIONS.invalid', 'email')
    if (isEmpty(password)) errors.password = res.__('VALIDATIONS.required', 'password')
    const normalizedRole = typeof role === 'string' ? role.toLowerCase() : role
    if (normalizedRole && !ALLOWED_ROLES.includes(normalizedRole)) errors.role = res.__('VALIDATIONS.invalid', 'role')

    if (!this.sendErrors(res, errors)) next()
  }

  signIn(req: Request, res: Response, next: NextFunction) {
    const { email, password } = req.body
    const errors: Record<string, string> = {}

    if (isEmpty(email)) errors.email = res.__('VALIDATIONS.required', 'email')
    else if (!isEmail(email)) errors.email = res.__('VALIDATIONS.invalid', 'email')
    if (isEmpty(password)) errors.password = res.__('VALIDATIONS.required', 'password')

    if (!this.sendErrors(res, errors)) next()
  }

  createUser(req: Request, res: Response, next: NextFunction) {
    const { name, email, password, role } = req.body
    const errors: Record<string, string> = {}

    if (isEmpty(name)) errors.name = res.__('VALIDATIONS.required', 'name')
    if (isEmpty(email)) errors.email = res.__('VALIDATIONS.required', 'email')
    else if (!isEmail(email)) errors.email = res.__('VALIDATIONS.invalid', 'email')
    if (isEmpty(password)) errors.password = res.__('VALIDATIONS.required', 'password')
    const normalizedRole = typeof role === 'string' ? role.toLowerCase() : role
    if (normalizedRole && !ALLOWED_ROLES.includes(normalizedRole)) errors.role = res.__('VALIDATIONS.invalid', 'role')

    if (!this.sendErrors(res, errors)) next()
  }

  updateUser(req: Request, res: Response, next: NextFunction) {
    const { email, role, password } = req.body
    const errors: Record<string, string> = {}

    if (email && !isEmail(email)) errors.email = res.__('VALIDATIONS.invalid', 'email')
    const normalizedRole = typeof role === 'string' ? role.toLowerCase() : role
    if (normalizedRole && !ALLOWED_ROLES.includes(normalizedRole)) errors.role = res.__('VALIDATIONS.invalid', 'role')
    if (password && password.length < 6) errors.password = res.__('VALIDATIONS.min_length', 'password', '6')

    if (!this.sendErrors(res, errors)) next()
  }

  changePassword(req: Request, res: Response, next: NextFunction) {
    const { currentPassword, newPassword } = req.body
    const errors: Record<string, string> = {}

    if (isEmpty(currentPassword)) errors.currentPassword = res.__('VALIDATIONS.required', 'current password')
    if (isEmpty(newPassword)) errors.newPassword = res.__('VALIDATIONS.required', 'new password')
    else if (newPassword.length < 6) errors.newPassword = res.__('VALIDATIONS.min_length', 'new password', '6')

    if (!this.sendErrors(res, errors)) next()
  }
}

export default new AuthValidations()
