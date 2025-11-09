import STATUS_CODES from 'http-status-codes'
import { CustomRequest, CustomResponse } from '../../../environment'
import { createResponse, createResponse1 } from '../../../utils/helper'
import { logger } from '../../../utils/logger'
import TaskModel from '../model/TaskModel'
import ProjectModel from '../../Projects/model/ProjectModel'
import authModel from '../../Auth/model/AuthModel'
import { TASK_DEFAULT_LIMIT, TASK_PRIORITY, TASK_STATUS } from '../../../utils/constants'
import { TaskAssignmentSchema, TaskSchema, TaskStatus, TaskPriority } from '../schema'
import ProjectSchema from '../../Projects/schema/ProjectSchema'
import { AuthSchema } from '../../Auth/schema/AuthSchema'

type SanitizedAssignment = {
  uuid: string
  user: {
    uuid: string
    name: string
    email: string
  }
  assigned_at: Date
}

type SanitizedTask = {
  uuid: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  project: {
    uuid: string
    name: string
    status: string
  }
  assignee: {
    uuid: string
    name: string
    email: string
  } | null
  assignments: SanitizedAssignment[]
  created_at: Date
  updated_at: Date
}

const ALLOWED_STATUS = Object.values(TASK_STATUS) as TaskStatus[]
const ALLOWED_PRIORITY = Object.values(TASK_PRIORITY) as TaskPriority[]

class TaskController {
  private formatDate(value: unknown): string | null {
    if (!value) return null
    if (value instanceof Date) {
      return value.toISOString().slice(0, 10)
    }
    if (typeof value === 'string') {
      return value
    }
    return null
  }

  private sanitize(task: TaskSchema): SanitizedTask {
    const plain = task.get({
      plain: true
    }) as TaskSchema & {
      project?: ProjectSchema
      assignee?: AuthSchema | null
      assignments?: (TaskAssignmentSchema & { user?: AuthSchema })[]
    }

    const project = plain.project
      ? {
          uuid: plain.project.uuid,
          name: plain.project.name,
          status: plain.project.status
        }
      : ({ uuid: '', name: '', status: '' } as any)

    const assignee = plain.assignee
      ? {
          uuid: plain.assignee.uuid,
          name: plain.assignee.name,
          email: plain.assignee.email
        }
      : null

    const assignments =
      plain.assignments?.map((assignment) => ({
        uuid: assignment.uuid,
        assigned_at: assignment.assigned_at,
        user: assignment.user
          ? {
              uuid: assignment.user.uuid,
              name: assignment.user.name,
              email: assignment.user.email
            }
          : { uuid: '', name: '', email: '' }
      })) ?? []

    return {
      uuid: plain.uuid,
      title: plain.title,
      description: plain.description,
      status: plain.status,
      priority: plain.priority,
      due_date: this.formatDate(plain.due_date),
      project,
      assignee,
      assignments,
      created_at: plain.created_at,
      updated_at: plain.updated_at
    }
  }

  private normalizeStatuses(value: unknown): TaskStatus[] | undefined {
    if (!value) return undefined
    const statuses = Array.isArray(value) ? value : String(value).split(',')
    const normalized = statuses.map((item) => item?.toString().trim().toLowerCase()).filter((item): item is TaskStatus => (ALLOWED_STATUS as string[]).includes(item))

    return normalized.length > 0 ? normalized : undefined
  }

  private normalizePriorities(value: unknown): TaskPriority[] | undefined {
    if (!value) return undefined
    const priorities = Array.isArray(value) ? value : String(value).split(',')
    const normalized = priorities.map((item) => item?.toString().trim().toLowerCase()).filter((item): item is TaskPriority => (ALLOWED_PRIORITY as string[]).includes(item))

    return normalized.length > 0 ? normalized : undefined
  }

  private async ensureProject(uuid: string | undefined, companyId: number): Promise<ProjectSchema | null> {
    if (!uuid) return null
    const project = await ProjectModel.findByUuid(uuid, companyId)
    if (!project) {
      throw new Error('INVALID_PROJECT')
    }
    return project
  }

  private async ensureUser(uuid: string | undefined, companyId: number): Promise<AuthSchema | null> {
    if (!uuid) return null
    const user = await authModel.findByUuid(uuid, companyId)
    if (!user) {
      throw new Error('INVALID_USER')
    }
    return user
  }

  private async ensureAssignmentUsers(uuids: string[] | undefined, companyId: number) {
    if (!uuids || uuids.length === 0) return []
    const unique = Array.from(new Set(uuids))
    const users = await authModel.findByUuids(unique, companyId)
    if (users.length !== unique.length) {
      throw new Error('INVALID_ASSIGNMENT_USERS')
    }
    return users
  }

  async list(req: CustomRequest, res: CustomResponse) {
    try {
      const companyId = req.user?.company_id
      if (!companyId) {
        return createResponse1({ res, status: STATUS_CODES.FORBIDDEN, message: 'Company context is required.' })
      }

      const page = Math.max(Number(req.query.page ?? 1), 1)
      const limit = Math.max(Number(req.query.limit ?? TASK_DEFAULT_LIMIT), 1)
      const offset = (page - 1) * limit

      const statuses = this.normalizeStatuses(req.query.status)
      const priorities = this.normalizePriorities(req.query.priority)

      let projectId: number | undefined
      if (req.query.project_uuid) {
        const project = await this.ensureProject(String(req.query.project_uuid), companyId)
        projectId = project?.id
      }

      let assigneeId: number | undefined
      if (req.query.assignee_uuid) {
        const assignee = await this.ensureUser(String(req.query.assignee_uuid), companyId)
        assigneeId = assignee?.id
      }

      const { rows, count } = await TaskModel.listTasks({
        search: req.query.search as string,
        status: statuses,
        priority: priorities,
        projectId,
        assigneeId,
        limit,
        offset,
        includeAssignments: true,
        companyId
      })

      return createResponse(res, STATUS_CODES.OK, res.__('TASK.LIST_SUCCESS'), {
        tasks: rows.map((row) => this.sanitize(row)),
        pagination: {
          total: count,
          page,
          limit
        }
      })
    } catch (error: any) {
      if (error instanceof Error) {
        switch (error.message) {
          case 'INVALID_PROJECT':
            return createResponse1({ res, status: STATUS_CODES.UNPROCESSABLE_ENTITY, message: res.__('VALIDATIONS.invalid', 'project_uuid') })
          case 'INVALID_USER':
            return createResponse1({ res, status: STATUS_CODES.UNPROCESSABLE_ENTITY, message: res.__('VALIDATIONS.invalid', 'assignee_uuid') })
        }
      }
      logger.error(__filename, 'list', req.custom?.request_uuid, 'Error listing tasks', error)
      return createResponse1({
        res,
        status: STATUS_CODES.INTERNAL_SERVER_ERROR,
        message: res.__('SERVER_ERROR_MESSAGE')
      })
    }
  }

  async create(req: CustomRequest, res: CustomResponse) {
    try {
      const companyId = req.user?.company_id
      if (!companyId) {
        return createResponse1({ res, status: STATUS_CODES.FORBIDDEN, message: 'Company context is required.' })
      }

      const { project_uuid, title, description, status, priority, assignee_uuid, due_date, assigned_user_uuids } = req.body

      const project = await this.ensureProject(project_uuid, companyId)
      const assignee = await this.ensureUser(assignee_uuid, companyId)
      const assignmentUsers = await this.ensureAssignmentUsers(assigned_user_uuids, companyId)

      const normalizedStatus = typeof status === 'string' && ALLOWED_STATUS.includes(status.toLowerCase() as TaskStatus) ? (status.toLowerCase() as TaskStatus) : TASK_STATUS.TODO

      const normalizedPriority =
        typeof priority === 'string' && ALLOWED_PRIORITY.includes(priority.toLowerCase() as TaskPriority) ? (priority.toLowerCase() as TaskPriority) : TASK_PRIORITY.MEDIUM

      const task = await TaskModel.createTask(
        {
          project_id: project!.id,
          title,
          description,
          status: normalizedStatus,
          priority: normalizedPriority,
          assignee_id: assignee?.id ?? null,
          due_date: due_date ?? null,
          company_id: companyId
        },
        assignmentUsers.map((user) => user.id)
      )

      await task.reload({
        include: [
          { model: ProjectSchema, as: 'project' },
          { model: AuthSchema, as: 'assignee' },
          { model: TaskAssignmentSchema, as: 'assignments', include: [{ model: AuthSchema, as: 'user' }] }
        ]
      })

      return createResponse(res, STATUS_CODES.CREATED, res.__('TASK.CREATE_SUCCESS'), this.sanitize(task))
    } catch (error: any) {
      if (error instanceof Error) {
        switch (error.message) {
          case 'INVALID_PROJECT':
            return createResponse1({ res, status: STATUS_CODES.UNPROCESSABLE_ENTITY, message: res.__('VALIDATIONS.invalid', 'project_uuid') })
          case 'INVALID_USER':
            return createResponse1({ res, status: STATUS_CODES.UNPROCESSABLE_ENTITY, message: res.__('VALIDATIONS.invalid', 'assignee_uuid') })
          case 'INVALID_ASSIGNMENT_USERS':
            return createResponse1({
              res,
              status: STATUS_CODES.UNPROCESSABLE_ENTITY,
              message: res.__('VALIDATIONS.invalid', 'assigned_user_uuids')
            })
        }
      }
      logger.error(__filename, 'create', req.custom?.request_uuid, 'Error creating task', error)
      return createResponse1({
        res,
        status: STATUS_CODES.INTERNAL_SERVER_ERROR,
        message: res.__('SERVER_ERROR_MESSAGE')
      })
    }
  }

  async get(req: CustomRequest, res: CustomResponse) {
    try {
      const { uuid } = req.params
      const companyId = req.user?.company_id
      if (!companyId) {
        return createResponse1({ res, status: STATUS_CODES.FORBIDDEN, message: 'Company context is required.' })
      }

      const task = await TaskModel.findByUuid(uuid, companyId)
      if (!task) {
        return createResponse1({ res, status: STATUS_CODES.NOT_FOUND, message: res.__('TASK.NOT_FOUND') })
      }

      return createResponse(res, STATUS_CODES.OK, res.__('TASK.DETAIL_SUCCESS'), this.sanitize(task))
    } catch (error) {
      logger.error(__filename, 'get', req.custom?.request_uuid, 'Error fetching task', error)
      return createResponse1({
        res,
        status: STATUS_CODES.INTERNAL_SERVER_ERROR,
        message: res.__('SERVER_ERROR_MESSAGE')
      })
    }
  }

  async update(req: CustomRequest, res: CustomResponse) {
    try {
      const { uuid } = req.params
      const { title, description, status, priority, assignee_uuid, due_date, assigned_user_uuids } = req.body

      const companyId = req.user?.company_id
      if (!companyId) {
        return createResponse1({ res, status: STATUS_CODES.FORBIDDEN, message: 'Company context is required.' })
      }

      const existing = await TaskModel.findByUuid(uuid, companyId)
      if (!existing) {
        return createResponse1({ res, status: STATUS_CODES.NOT_FOUND, message: res.__('TASK.NOT_FOUND') })
      }

      let assigneeId: number | null | undefined
      if (assignee_uuid !== undefined) {
        if (!assignee_uuid) {
          assigneeId = null
        } else {
          const assignee = await this.ensureUser(assignee_uuid, companyId)
          assigneeId = assignee?.id ?? null
        }
      }

      let assignmentsIds: number[] | undefined
      if (assigned_user_uuids !== undefined) {
        const assignmentUsers = await this.ensureAssignmentUsers(assigned_user_uuids ?? [], companyId)
        assignmentsIds = assignmentUsers.map((user) => user.id)
      }

      const payload: any = {}

      if (title !== undefined) payload.title = title
      if (description !== undefined) payload.description = description
      if (status !== undefined) {
        const normalized = typeof status === 'string' && ALLOWED_STATUS.includes(status.toLowerCase() as TaskStatus) ? status.toLowerCase() : null
        if (!normalized) {
          return createResponse1({ res, status: STATUS_CODES.UNPROCESSABLE_ENTITY, message: res.__('VALIDATIONS.invalid', 'status') })
        }
        payload.status = normalized
      }
      if (priority !== undefined) {
        const normalized = typeof priority === 'string' && ALLOWED_PRIORITY.includes(priority.toLowerCase() as TaskPriority) ? priority.toLowerCase() : null
        if (!normalized) {
          return createResponse1({ res, status: STATUS_CODES.UNPROCESSABLE_ENTITY, message: res.__('VALIDATIONS.invalid', 'priority') })
        }
        payload.priority = normalized
      }
      if (assigneeId !== undefined) payload.assignee_id = assigneeId
      if (due_date !== undefined) payload.due_date = due_date ?? null

      const updated = await TaskModel.updateByUuid(uuid, payload, assignmentsIds, companyId)
      if (!updated) {
        return createResponse1({ res, status: STATUS_CODES.INTERNAL_SERVER_ERROR, message: res.__('SERVER_ERROR_MESSAGE') })
      }

      return createResponse(res, STATUS_CODES.OK, res.__('TASK.UPDATE_SUCCESS'), this.sanitize(updated))
    } catch (error: any) {
      if (error instanceof Error) {
        switch (error.message) {
          case 'INVALID_USER':
            return createResponse1({ res, status: STATUS_CODES.UNPROCESSABLE_ENTITY, message: res.__('VALIDATIONS.invalid', 'assignee_uuid') })
          case 'INVALID_ASSIGNMENT_USERS':
            return createResponse1({
              res,
              status: STATUS_CODES.UNPROCESSABLE_ENTITY,
              message: res.__('VALIDATIONS.invalid', 'assigned_user_uuids')
            })
        }
      }
      logger.error(__filename, 'update', req.custom?.request_uuid, 'Error updating task', error)
      return createResponse1({
        res,
        status: STATUS_CODES.INTERNAL_SERVER_ERROR,
        message: res.__('SERVER_ERROR_MESSAGE')
      })
    }
  }

  async remove(req: CustomRequest, res: CustomResponse) {
    try {
      const { uuid } = req.params
      const companyId = req.user?.company_id
      if (!companyId) {
        return createResponse1({ res, status: STATUS_CODES.FORBIDDEN, message: 'Company context is required.' })
      }

      const deleted = await TaskModel.deleteByUuid(uuid, companyId)
      if (!deleted) {
        return createResponse1({ res, status: STATUS_CODES.NOT_FOUND, message: res.__('TASK.NOT_FOUND') })
      }

      return createResponse1({ res, status: STATUS_CODES.OK, message: res.__('TASK.DELETE_SUCCESS') })
    } catch (error) {
      logger.error(__filename, 'remove', req.custom?.request_uuid, 'Error deleting task', error)
      return createResponse1({
        res,
        status: STATUS_CODES.INTERNAL_SERVER_ERROR,
        message: res.__('SERVER_ERROR_MESSAGE')
      })
    }
  }
}

export default new TaskController()
