import { NextFunction, Request, Response } from 'express'
import { createValidationResponse } from '../../../utils/helper'
import { isEmpty } from '../../../utils/validator'
import { TASK_STATUS, TASK_PRIORITY, REGEXP } from '../../../utils/constants'

const ALLOWED_STATUS = Object.values(TASK_STATUS)
const ALLOWED_PRIORITY = Object.values(TASK_PRIORITY)

const validateStatus = (value: unknown) => {
  if (typeof value !== 'string') return false
  return (ALLOWED_STATUS as readonly string[]).includes(value.toLowerCase())
}
const validatePriority = (value: unknown) => {
  if (typeof value !== 'string') return false
  return (ALLOWED_PRIORITY as readonly string[]).includes(value.toLowerCase())
}
const isUuid = (value: unknown) => typeof value === 'string' && REGEXP.UUID.test(value)

const normalizeArray = (value: unknown): string[] | undefined => {
  if (!value) return undefined
  if (Array.isArray(value)) {
    return value.map((item) => String(item))
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return undefined
}

class TaskValidations {
  private sendErrors(res: Response, errors: Record<string, string>) {
    if (Object.keys(errors).length > 0) {
      createValidationResponse(res, errors)
      return true
    }
    return false
  }

  list = (req: Request, res: Response, next: NextFunction) => {
    const { page, limit, status, priority, project_uuid, assignee_uuid } = req.query
    const errors: Record<string, string> = {}

    if (page && Number(page) <= 0) errors.page = res.__('VALIDATIONS.invalid', 'page')
    if (limit && Number(limit) <= 0) errors.limit = res.__('VALIDATIONS.invalid', 'limit')

    if (status) {
      const statuses = normalizeArray(status)
      if (!statuses || statuses.some((value) => !validateStatus(value))) {
        errors.status = res.__('VALIDATIONS.invalid', 'status')
      }
    }

    if (priority) {
      const priorities = normalizeArray(priority)
      if (!priorities || priorities.some((value) => !validatePriority(value))) {
        errors.priority = res.__('VALIDATIONS.invalid', 'priority')
      }
    }

    if (project_uuid && !isUuid(project_uuid)) {
      errors.project_uuid = res.__('VALIDATIONS.invalid', 'project_uuid')
    }

    if (assignee_uuid && !isUuid(assignee_uuid)) {
      errors.assignee_uuid = res.__('VALIDATIONS.invalid', 'assignee_uuid')
    }

    if (!this.sendErrors(res, errors)) next()
  }

  create = (req: Request, res: Response, next: NextFunction) => {
    const { project_uuid, title, status, priority, due_date, assignee_uuid, assigned_user_uuids } = req.body
    const errors: Record<string, string> = {}

    if (isEmpty(project_uuid) || !isUuid(project_uuid)) {
      errors.project_uuid = res.__('VALIDATIONS.invalid', 'project_uuid')
    }

    if (isEmpty(title)) {
      errors.title = res.__('VALIDATIONS.required', 'title')
    }

    if (!isEmpty(status) && !validateStatus(status)) {
      errors.status = res.__('VALIDATIONS.invalid', 'status')
    }

    if (!isEmpty(priority) && !validatePriority(priority)) {
      errors.priority = res.__('VALIDATIONS.invalid', 'priority')
    }

    if (!isEmpty(due_date) && (typeof due_date !== 'string' || !REGEXP.DATE_FORMAT.test(due_date))) {
      errors.due_date = res.__('VALIDATIONS.invalid', 'due_date')
    }

    if (!isEmpty(assignee_uuid) && !isUuid(assignee_uuid)) {
      errors.assignee_uuid = res.__('VALIDATIONS.invalid', 'assignee_uuid')
    }

    if (assigned_user_uuids !== undefined) {
      if (!Array.isArray(assigned_user_uuids)) {
        errors.assigned_user_uuids = res.__('VALIDATIONS.invalid', 'assigned_user_uuids')
      } else if (assigned_user_uuids.some((uuid: any) => !isUuid(String(uuid)))) {
        errors.assigned_user_uuids = res.__('VALIDATIONS.invalid', 'assigned_user_uuids')
      }
    }

    if (!this.sendErrors(res, errors)) next()
  }

  update = (req: Request, res: Response, next: NextFunction) => {
    const { title, status, priority, due_date, assignee_uuid, assigned_user_uuids } = req.body
    const errors: Record<string, string> = {}

    if (title !== undefined && isEmpty(title)) {
      errors.title = res.__('VALIDATIONS.required', 'title')
    }

    if (status !== undefined) {
      if (isEmpty(status) || !validateStatus(status)) {
        errors.status = res.__('VALIDATIONS.invalid', 'status')
      }
    }

    if (priority !== undefined) {
      if (isEmpty(priority) || !validatePriority(priority)) {
        errors.priority = res.__('VALIDATIONS.invalid', 'priority')
      }
    }

    if (due_date !== undefined && !isEmpty(due_date)) {
      if (typeof due_date !== 'string' || !REGEXP.DATE_FORMAT.test(due_date)) {
        errors.due_date = res.__('VALIDATIONS.invalid', 'due_date')
      }
    }

    if (assignee_uuid !== undefined && !isEmpty(assignee_uuid) && !isUuid(assignee_uuid)) {
      errors.assignee_uuid = res.__('VALIDATIONS.invalid', 'assignee_uuid')
    }

    if (assigned_user_uuids !== undefined) {
      if (!Array.isArray(assigned_user_uuids)) {
        errors.assigned_user_uuids = res.__('VALIDATIONS.invalid', 'assigned_user_uuids')
      } else if (assigned_user_uuids.some((uuid: any) => !isUuid(String(uuid)))) {
        errors.assigned_user_uuids = res.__('VALIDATIONS.invalid', 'assigned_user_uuids')
      }
    }

    if (!this.sendErrors(res, errors)) next()
  }
}

export default new TaskValidations()
