import STATUS_CODES from 'http-status-codes'
import { CustomRequest, CustomResponse } from '../../../environment'
import { createResponse, createResponse1 } from '../../../utils/helper'
import { logger } from '../../../utils/logger'
import ProjectModel from '../model/ProjectModel'
import { PROJECT_DEFAULT_LIMIT, PROJECT_STATUS, ROLE_TYPES } from '../../../utils/constants'
import ContactModel from '../../Contacts/model/ContactModel'
import authModel from '../../Auth/model/AuthModel'
import { ContactSchema } from '../../Contacts/schema/ContactSchema'
import { AuthSchema } from '../../Auth/schema/AuthSchema'
import ProjectSchema, { ProjectStatus } from '../schema/ProjectSchema'
import { REGEXP } from '../../../utils/constants'

type SanitizedProject = {
  uuid: string
  name: string
  description: string | null
  status: ProjectStatus
  client: { uuid: string; name: string; type: string } | null
  manager: { uuid: string; name: string; email: string } | null
  start_date: string | null
  end_date: string | null
  budget: number
  created_at: Date
  updated_at: Date
}

const ALLOWED_STATUS = Object.values(PROJECT_STATUS) as ProjectStatus[]

class ProjectController {
  private sanitize(project: ProjectSchema): SanitizedProject {
    const plain = project.get({ plain: true }) as ProjectSchema & {
      client?: ContactSchema | null
      manager?: AuthSchema | null
    }

    const formatDate = (value: unknown): string | null => {
      if (!value) return null
      if (value instanceof Date) {
        return value.toISOString().slice(0, 10)
      }
      if (typeof value === 'string') {
        return value
      }
      return null
    }

    const client = plain.client
      ? {
          uuid: plain.client.uuid,
          name: plain.client.name,
          type: plain.client.type
        }
      : null

    const manager = plain.manager
      ? {
          uuid: plain.manager.uuid,
          name: plain.manager.name,
          email: plain.manager.email
        }
      : null

    return {
      uuid: plain.uuid,
      name: plain.name,
      description: plain.description,
      status: plain.status,
      client,
      manager,
      start_date: formatDate(plain.start_date),
      end_date: formatDate(plain.end_date),
      budget: Number(plain.budget ?? 0),
      created_at: plain.created_at,
      updated_at: plain.updated_at
    }
  }

  private normalizeStatuses(value: unknown): ProjectStatus[] | undefined {
    if (!value) return undefined
    const statuses = Array.isArray(value) ? value : String(value).split(',')
    const normalized = statuses.map((item) => item?.toString().trim().toLowerCase()).filter((item): item is ProjectStatus => (ALLOWED_STATUS as string[]).includes(item))

    return normalized.length > 0 ? normalized : undefined
  }

  async list(req: CustomRequest, res: CustomResponse) {
    try {
      const companyId = req.user?.company_id
      if (!companyId) {
        return createResponse1({
          res,
          status: STATUS_CODES.FORBIDDEN,
          message: 'Company context is required.'
        })
      }

      const page = Math.max(Number(req.query.page ?? 1), 1)
      const limit = Math.max(Number(req.query.limit ?? PROJECT_DEFAULT_LIMIT), 1)
      const offset = (page - 1) * limit

      const statuses = this.normalizeStatuses(req.query.status)

      let managerId: number | undefined
      if (req.query.manager_uuid) {
        const manager = await authModel.findByUuid(String(req.query.manager_uuid), companyId)
        if (!manager) {
          return createResponse1({
            res,
            status: STATUS_CODES.UNPROCESSABLE_ENTITY,
            message: res.__('VALIDATIONS.invalid', 'manager_uuid')
          })
        }
        managerId = manager.id
      }

      let clientId: number | undefined
      if (req.query.client_uuid) {
        const client = await ContactModel.findByUuid(String(req.query.client_uuid), companyId)
        if (!client) {
          return createResponse1({
            res,
            status: STATUS_CODES.UNPROCESSABLE_ENTITY,
            message: res.__('VALIDATIONS.invalid', 'client_uuid')
          })
        }
        clientId = client.id
      }

      const { rows, count } = await ProjectModel.listProjects({
        search: req.query.search as string,
        status: statuses,
        limit,
        offset,
        managerId,
        clientId,
        companyId
      })

      return createResponse(res, STATUS_CODES.OK, res.__('PROJECT.LIST_SUCCESS'), {
        projects: rows.map((row) => this.sanitize(row)),
        pagination: {
          total: count,
          page,
          limit
        }
      })
    } catch (error) {
      logger.error(__filename, 'list', req.custom?.request_uuid, 'Error listing projects', error)
      return createResponse1({
        res,
        status: STATUS_CODES.INTERNAL_SERVER_ERROR,
        message: res.__('SERVER_ERROR_MESSAGE')
      })
    }
  }

  private async ensureClient(clientUuid?: string, companyId?: number) {
    if (!clientUuid) return null
    const client = await ContactModel.findByUuid(clientUuid, companyId)
    if (!client) {
      throw new Error('INVALID_CLIENT')
    }
    if (client.type === 'vendor') {
      throw new Error('INVALID_CLIENT_TYPE')
    }
    return client
  }

  private async ensureManager(managerUuid?: string, companyId?: number) {
    if (!managerUuid) return null
    const manager = await authModel.findByUuid(managerUuid, companyId)
    if (!manager) {
      throw new Error('INVALID_MANAGER')
    }
    if (manager.role !== ROLE_TYPES.ADMIN && manager.role !== ROLE_TYPES.PROJECT_MANAGER) {
      throw new Error('INVALID_MANAGER_ROLE')
    }
    return manager
  }

  private async resolveDefaultManager(req: CustomRequest) {
    const currentUser = req.user
    if (!currentUser) return null
    if (currentUser.role === ROLE_TYPES.PROJECT_MANAGER) {
      const manager = await authModel.findById(currentUser.id, currentUser.company_id)
      if (manager) return manager
    }
    return null
  }

  private validateDateRange(startDate?: string | null, endDate?: string | null) {
    if (startDate && !REGEXP.DATE_FORMAT.test(startDate)) {
      throw new Error('INVALID_START_DATE')
    }
    if (endDate && !REGEXP.DATE_FORMAT.test(endDate)) {
      throw new Error('INVALID_END_DATE')
    }
    if (startDate && endDate && startDate > endDate) {
      throw new Error('INVALID_DATE_RANGE')
    }
  }

  async create(req: CustomRequest, res: CustomResponse) {
    try {
      const companyId = req.user?.company_id
      if (!companyId) {
        return createResponse1({ res, status: STATUS_CODES.FORBIDDEN, message: 'Company context is required.' })
      }

      const { name, description, client_uuid, manager_uuid, status, start_date, end_date, budget } = req.body

      this.validateDateRange(start_date, end_date)

      const client = await this.ensureClient(client_uuid, companyId)
      const manager =
        manager_uuid !== undefined ? await this.ensureManager(manager_uuid, companyId) : await this.resolveDefaultManager(req)

      const normalizedBudget = budget !== undefined && budget !== null ? Number(budget) : 0
      if (Number.isNaN(normalizedBudget) || normalizedBudget < 0) {
        return createResponse1({ res, status: STATUS_CODES.UNPROCESSABLE_ENTITY, message: res.__('VALIDATIONS.invalid', 'budget') })
      }

      const normalizedStatus = typeof status === 'string' && ALLOWED_STATUS.includes(status.toLowerCase() as ProjectStatus) ? (status.toLowerCase() as ProjectStatus) : 'planned'

      const project = await ProjectModel.createProject({
        name,
        description,
        client_id: client?.id ?? null,
        manager_id: manager?.id ?? null,
        status: normalizedStatus,
        start_date: start_date ?? null,
        end_date: end_date ?? null,
        budget: normalizedBudget,
        company_id: companyId
      })

      await project.reload({
        include: [
          { model: ContactSchema, as: 'client', attributes: ['uuid', 'name', 'type'] },
          { model: AuthSchema, as: 'manager', attributes: ['uuid', 'name', 'email'] }
        ]
      })

      return createResponse(res, STATUS_CODES.CREATED, res.__('PROJECT.CREATE_SUCCESS'), this.sanitize(project))
    } catch (error: any) {
      if (error instanceof Error) {
        switch (error.message) {
          case 'INVALID_CLIENT':
            return createResponse1({ res, status: STATUS_CODES.UNPROCESSABLE_ENTITY, message: res.__('VALIDATIONS.invalid', 'client_uuid') })
          case 'INVALID_CLIENT_TYPE':
            return createResponse1({
              res,
              status: STATUS_CODES.UNPROCESSABLE_ENTITY,
              message: res.__('VALIDATIONS.invalid', 'client_uuid')
            })
          case 'INVALID_MANAGER':
            return createResponse1({ res, status: STATUS_CODES.UNPROCESSABLE_ENTITY, message: res.__('VALIDATIONS.invalid', 'manager_uuid') })
          case 'INVALID_MANAGER_ROLE':
            return createResponse1({
              res,
              status: STATUS_CODES.FORBIDDEN,
              message: res.__('AUTH.INSUFFICIENT_PERMISSIONS')
            })
          case 'INVALID_START_DATE':
            return createResponse1({ res, status: STATUS_CODES.UNPROCESSABLE_ENTITY, message: res.__('VALIDATIONS.invalid', 'start_date') })
          case 'INVALID_END_DATE':
            return createResponse1({ res, status: STATUS_CODES.UNPROCESSABLE_ENTITY, message: res.__('VALIDATIONS.invalid', 'end_date') })
          case 'INVALID_DATE_RANGE':
            return createResponse1({ res, status: STATUS_CODES.UNPROCESSABLE_ENTITY, message: res.__('VALIDATIONS.invalid', 'date_range') })
          default:
            break
        }
      }
      logger.error(__filename, 'create', req.custom?.request_uuid, 'Error creating project', error)
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

      const project = await ProjectModel.findByUuid(uuid, companyId)
      if (!project) {
        return createResponse1({ res, status: STATUS_CODES.NOT_FOUND, message: res.__('PROJECT.NOT_FOUND') })
      }

      return createResponse(res, STATUS_CODES.OK, res.__('PROJECT.DETAIL_SUCCESS'), this.sanitize(project))
    } catch (error) {
      logger.error(__filename, 'get', req.custom?.request_uuid, 'Error fetching project', error)
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
      const { name, description, client_uuid, manager_uuid, status, start_date, end_date, budget } = req.body

      const companyId = req.user?.company_id
      if (!companyId) {
        return createResponse1({ res, status: STATUS_CODES.FORBIDDEN, message: 'Company context is required.' })
      }

      this.validateDateRange(start_date, end_date)

      const existing = await ProjectModel.findByUuid(uuid, companyId)
      if (!existing) {
        return createResponse1({ res, status: STATUS_CODES.NOT_FOUND, message: res.__('PROJECT.NOT_FOUND') })
      }

      let clientId: number | null | undefined
      if (client_uuid !== undefined) {
        const client = await this.ensureClient(client_uuid, companyId)
        clientId = client?.id ?? null
      }

      let managerId: number | null | undefined
      if (manager_uuid !== undefined) {
        const manager = await this.ensureManager(manager_uuid, companyId)
        managerId = manager?.id ?? null
      }

      const payload: any = {}
      if (name !== undefined) payload.name = name
      if (description !== undefined) payload.description = description
      if (clientId !== undefined) payload.client_id = clientId
      if (managerId !== undefined) payload.manager_id = managerId
      if (status !== undefined) {
        const normalizedStatus = typeof status === 'string' && ALLOWED_STATUS.includes(status.toLowerCase() as ProjectStatus) ? (status.toLowerCase() as ProjectStatus) : null
        if (!normalizedStatus) {
          return createResponse1({ res, status: STATUS_CODES.UNPROCESSABLE_ENTITY, message: res.__('VALIDATIONS.invalid', 'status') })
        }
        payload.status = normalizedStatus
      }
      if (start_date !== undefined) payload.start_date = start_date
      if (end_date !== undefined) payload.end_date = end_date
      if (budget !== undefined) {
        const normalizedBudget = Number(budget)
        if (Number.isNaN(normalizedBudget) || normalizedBudget < 0) {
          return createResponse1({ res, status: STATUS_CODES.UNPROCESSABLE_ENTITY, message: res.__('VALIDATIONS.invalid', 'budget') })
        }
        payload.budget = normalizedBudget
      }

      const updated = await ProjectModel.updateByUuid(uuid, payload, companyId)
      if (!updated) {
        return createResponse1({ res, status: STATUS_CODES.INTERNAL_SERVER_ERROR, message: res.__('SERVER_ERROR_MESSAGE') })
      }

      return createResponse(res, STATUS_CODES.OK, res.__('PROJECT.UPDATE_SUCCESS'), this.sanitize(updated))
    } catch (error: any) {
      if (error instanceof Error) {
        switch (error.message) {
          case 'INVALID_CLIENT':
            return createResponse1({ res, status: STATUS_CODES.UNPROCESSABLE_ENTITY, message: res.__('VALIDATIONS.invalid', 'client_uuid') })
          case 'INVALID_CLIENT_TYPE':
            return createResponse1({
              res,
              status: STATUS_CODES.UNPROCESSABLE_ENTITY,
              message: res.__('VALIDATIONS.invalid', 'client_uuid')
            })
          case 'INVALID_MANAGER':
            return createResponse1({ res, status: STATUS_CODES.UNPROCESSABLE_ENTITY, message: res.__('VALIDATIONS.invalid', 'manager_uuid') })
          case 'INVALID_MANAGER_ROLE':
            return createResponse1({ res, status: STATUS_CODES.FORBIDDEN, message: res.__('AUTH.INSUFFICIENT_PERMISSIONS') })
          case 'INVALID_START_DATE':
            return createResponse1({ res, status: STATUS_CODES.UNPROCESSABLE_ENTITY, message: res.__('VALIDATIONS.invalid', 'start_date') })
          case 'INVALID_END_DATE':
            return createResponse1({ res, status: STATUS_CODES.UNPROCESSABLE_ENTITY, message: res.__('VALIDATIONS.invalid', 'end_date') })
          case 'INVALID_DATE_RANGE':
            return createResponse1({ res, status: STATUS_CODES.UNPROCESSABLE_ENTITY, message: res.__('VALIDATIONS.invalid', 'date_range') })
          default:
            break
        }
      }
      logger.error(__filename, 'update', req.custom?.request_uuid, 'Error updating project', error)
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

      const deleted = await ProjectModel.deleteByUuid(uuid, companyId)
      if (!deleted) {
        return createResponse1({ res, status: STATUS_CODES.NOT_FOUND, message: res.__('PROJECT.NOT_FOUND') })
      }

      return createResponse1({ res, status: STATUS_CODES.OK, message: res.__('PROJECT.DELETE_SUCCESS') })
    } catch (error) {
      logger.error(__filename, 'remove', req.custom?.request_uuid, 'Error deleting project', error)
      return createResponse1({
        res,
        status: STATUS_CODES.INTERNAL_SERVER_ERROR,
        message: res.__('SERVER_ERROR_MESSAGE')
      })
    }
  }
}

export default new ProjectController()
