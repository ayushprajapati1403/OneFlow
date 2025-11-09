import { NextFunction, Request, Response } from 'express'
import { createValidationResponse } from '../../../utils/helper'
import { isEmpty, isEmail } from '../../../utils/validator'
import { CONTACT_TYPES } from '../../../utils/constants'
import type { ContactType } from '../schema/ContactSchema'

const ALLOWED_TYPES = Object.values(CONTACT_TYPES) as ContactType[]

const normalizeType = (value: unknown): ContactType | undefined => {
  if (typeof value !== 'string') return undefined
  const lowered = value.toLowerCase()
  return (ALLOWED_TYPES as string[]).includes(lowered) ? (lowered as (typeof CONTACT_TYPES)[keyof typeof CONTACT_TYPES]) : undefined
}

class ContactValidations {
  private sendErrors(res: Response, errors: Record<string, string>) {
    if (Object.keys(errors).length > 0) {
      createValidationResponse(res, errors)
      return true
    }
    return false
  }

  list = (req: Request, res: Response, next: NextFunction) => {
    const { page, limit, type } = req.query
    const errors: Record<string, string> = {}

    if (page && Number(page) <= 0) errors.page = res.__('VALIDATIONS.invalid', 'page')
    if (limit && Number(limit) <= 0) errors.limit = res.__('VALIDATIONS.invalid', 'limit')

    if (type && !normalizeType(type)) {
      errors.type = res.__('VALIDATIONS.invalid', 'type')
    }

    if (!this.sendErrors(res, errors)) next()
  }

  create = (req: Request, res: Response, next: NextFunction) => {
    const { name, type, email } = req.body
    const errors: Record<string, string> = {}

    if (isEmpty(name)) errors.name = res.__('VALIDATIONS.required', 'name')
    if (isEmpty(type)) errors.type = res.__('VALIDATIONS.required', 'type')
    else if (!normalizeType(type)) errors.type = res.__('VALIDATIONS.invalid', 'type')

    if (!isEmpty(email) && !isEmail(email)) {
      errors.email = res.__('VALIDATIONS.invalid', 'email')
    }

    if (!this.sendErrors(res, errors)) next()
  }

  update = (req: Request, res: Response, next: NextFunction) => {
    const { name, type, email } = req.body
    const errors: Record<string, string> = {}

    if (name !== undefined && isEmpty(name)) {
      errors.name = res.__('VALIDATIONS.required', 'name')
    }

    if (type !== undefined) {
      if (isEmpty(type)) errors.type = res.__('VALIDATIONS.required', 'type')
      else if (!normalizeType(type)) errors.type = res.__('VALIDATIONS.invalid', 'type')
    }

    if (email !== undefined && !isEmpty(email) && !isEmail(email)) {
      errors.email = res.__('VALIDATIONS.invalid', 'email')
    }

    if (!this.sendErrors(res, errors)) next()
  }
}

export default new ContactValidations()
