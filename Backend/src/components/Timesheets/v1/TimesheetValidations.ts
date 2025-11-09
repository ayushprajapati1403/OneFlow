import { NextFunction, Request, Response } from 'express'
import { createValidationResponse } from '../../../utils/helper'
import { isEmpty } from '../../../utils/validator'
import { REGEXP } from '../../../utils/constants'

const isUuid = (value: unknown) => typeof value === 'string' && REGEXP.UUID.test(value)
const isValidDate = (value: unknown) => typeof value === 'string' && REGEXP.DATE_FORMAT.test(value)

class TimesheetValidations {
  private sendErrors(res: Response, errors: Record<string, string>) {
    if (Object.keys(errors).length > 0) {
      createValidationResponse(res, errors)
      return true
    }
    return false
  }

  list = (req: Request, res: Response, next: NextFunction) => {
    const { page, limit, project_uuid, task_uuid, user_uuid, billable, date_from, date_to } = req.query
    const errors: Record<string, string> = {}

    if (page && Number(page) <= 0) errors.page = res.__('VALIDATIONS.invalid', 'page')
    if (limit && Number(limit) <= 0) errors.limit = res.__('VALIDATIONS.invalid', 'limit')

    if (project_uuid && !isUuid(project_uuid)) {
      errors.project_uuid = res.__('VALIDATIONS.invalid', 'project_uuid')
    }
    if (task_uuid && !isUuid(task_uuid)) {
      errors.task_uuid = res.__('VALIDATIONS.invalid', 'task_uuid')
    }
    if (user_uuid && !isUuid(user_uuid)) {
      errors.user_uuid = res.__('VALIDATIONS.invalid', 'user_uuid')
    }
    if (billable !== undefined) {
      const normalized = String(billable).toLowerCase()
      if (!['true', 'false'].includes(normalized)) {
        errors.billable = res.__('VALIDATIONS.invalid', 'billable')
      }
    }
    if (date_from && !isValidDate(date_from)) {
      errors.date_from = res.__('VALIDATIONS.invalid', 'date_from')
    }
    if (date_to && !isValidDate(date_to)) {
      errors.date_to = res.__('VALIDATIONS.invalid', 'date_to')
    }

    if (!this.sendErrors(res, errors)) next()
  }

  create = (req: Request, res: Response, next: NextFunction) => {
    const { project_uuid, task_uuid, user_uuid, date, hours, billable, cost_rate } = req.body
    const errors: Record<string, string> = {}

    if (isEmpty(project_uuid) || !isUuid(project_uuid)) {
      errors.project_uuid = res.__('VALIDATIONS.invalid', 'project_uuid')
    }

    if (!isEmpty(task_uuid) && !isUuid(task_uuid)) {
      errors.task_uuid = res.__('VALIDATIONS.invalid', 'task_uuid')
    }

    if (isEmpty(user_uuid) || !isUuid(user_uuid)) {
      errors.user_uuid = res.__('VALIDATIONS.invalid', 'user_uuid')
    }

    if (isEmpty(date) || !isValidDate(date)) {
      errors.date = res.__('VALIDATIONS.invalid', 'date')
    }

    const numericHours = Number(hours)
    if (Number.isNaN(numericHours) || numericHours <= 0) {
      errors.hours = res.__('VALIDATIONS.invalid', 'hours')
    }

    if (billable !== undefined && typeof billable !== 'boolean') {
      const normalized = String(billable).toLowerCase()
      if (!['true', 'false'].includes(normalized)) {
        errors.billable = res.__('VALIDATIONS.invalid', 'billable')
      }
    }

    if (cost_rate !== undefined) {
      const numericRate = Number(cost_rate)
      if (Number.isNaN(numericRate) || numericRate < 0) {
        errors.cost_rate = res.__('VALIDATIONS.invalid', 'cost_rate')
      }
    }

    if (!this.sendErrors(res, errors)) next()
  }

  update = (req: Request, res: Response, next: NextFunction) => {
    const { task_uuid, date, hours, billable, cost_rate } = req.body
    const errors: Record<string, string> = {}

    if (task_uuid !== undefined && task_uuid !== null && String(task_uuid).trim() !== '' && !isUuid(task_uuid)) {
      errors.task_uuid = res.__('VALIDATIONS.invalid', 'task_uuid')
    }

    if (date !== undefined && !isEmpty(date) && !isValidDate(date)) {
      errors.date = res.__('VALIDATIONS.invalid', 'date')
    }

    if (hours !== undefined) {
      const numericHours = Number(hours)
      if (Number.isNaN(numericHours) || numericHours <= 0) {
        errors.hours = res.__('VALIDATIONS.invalid', 'hours')
      }
    }

    if (billable !== undefined && typeof billable !== 'boolean') {
      const normalized = String(billable).toLowerCase()
      if (!['true', 'false'].includes(normalized)) {
        errors.billable = res.__('VALIDATIONS.invalid', 'billable')
      }
    }

    if (cost_rate !== undefined) {
      const numericRate = Number(cost_rate)
      if (Number.isNaN(numericRate) || numericRate < 0) {
        errors.cost_rate = res.__('VALIDATIONS.invalid', 'cost_rate')
      }
    }

    if (!this.sendErrors(res, errors)) next()
  }
}

export default new TimesheetValidations()
