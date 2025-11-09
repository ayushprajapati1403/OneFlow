import { FindOptions, Op, WhereOptions } from 'sequelize'
import ProjectSchema, { ProjectStatus } from '../schema/ProjectSchema'
import ContactSchema from '../../Contacts/schema/ContactSchema'
import AuthSchema from '../../Auth/schema/AuthSchema'

export interface ProjectListOptions {
  search?: string
  status?: ProjectStatus | ProjectStatus[]
  managerId?: number
  clientId?: number
  limit?: number
  offset?: number
  attributes?: FindOptions['attributes']
  companyId?: number
}

type ProjectCreationPayload = {
  name: string
  description?: string | null
  client_id?: number | null
  manager_id?: number | null
  status?: ProjectStatus
  start_date?: Date | string | null
  end_date?: Date | string | null
  budget?: number
  company_id: number
}

type ProjectUpdatePayload = Partial<ProjectCreationPayload>

class ProjectModel {
  async createProject(payload: ProjectCreationPayload): Promise<ProjectSchema> {
    return ProjectSchema.create(payload as any)
  }

  async findByUuid(uuid: string, companyId?: number): Promise<ProjectSchema | null> {
    return ProjectSchema.findOne({
      where: {
        uuid,
        ...(companyId ? { company_id: companyId } : {})
      },
      include: [
        {
          model: ContactSchema,
          as: 'client',
          attributes: ['uuid', 'name', 'type']
        },
        {
          model: AuthSchema,
          as: 'manager',
          attributes: ['uuid', 'name', 'email']
        }
      ]
    })
  }

  async findById(id: number, companyId?: number): Promise<ProjectSchema | null> {
    return ProjectSchema.findOne({
      where: {
        id,
        ...(companyId ? { company_id: companyId } : {})
      },
      include: [
        {
          model: ContactSchema,
          as: 'client',
          attributes: ['uuid', 'name', 'type']
        },
        {
          model: AuthSchema,
          as: 'manager',
          attributes: ['uuid', 'name', 'email']
        }
      ]
    })
  }

  async listProjects(options: ProjectListOptions = {}): Promise<{ rows: ProjectSchema[]; count: number }> {
    const where: WhereOptions = {}

    if (options.companyId) {
      Object.assign(where, { company_id: options.companyId })
    }

    if (options.search?.trim()) {
      const term = `%${options.search.trim()}%`
      Object.assign(where, {
        [Op.or]: [{ name: { [Op.iLike]: term } }, { description: { [Op.iLike]: term } }]
      })
    }

    if (options.status) {
      const statuses = Array.isArray(options.status) ? options.status : [options.status]
      Object.assign(where, { status: { [Op.in]: statuses } })
    }

    if (options.managerId) {
      Object.assign(where, { manager_id: options.managerId })
    }

    if (options.clientId) {
      Object.assign(where, { client_id: options.clientId })
    }

    return ProjectSchema.findAndCountAll({
      where,
      attributes: options.attributes,
      limit: options.limit,
      offset: options.offset,
      order: [['created_at', 'DESC']],
      include: [
        {
          model: ContactSchema,
          as: 'client',
          attributes: ['uuid', 'name', 'type']
        },
        {
          model: AuthSchema,
          as: 'manager',
          attributes: ['uuid', 'name', 'email']
        }
      ]
    })
  }

  async updateByUuid(uuid: string, payload: ProjectUpdatePayload, companyId?: number): Promise<ProjectSchema | null> {
    const [updatedCount, rows] = await ProjectSchema.update(payload as any, {
      where: {
        uuid,
        ...(companyId ? { company_id: companyId } : {})
      },
      returning: true,
      individualHooks: true
    })

    if (!updatedCount) {
      return null
    }

    const project = rows[0]
    if (!project) return null
    return ProjectSchema.findOne({
      where: {
        id: project.id,
        ...(companyId ? { company_id: companyId } : {})
      },
      include: [
        {
          model: ContactSchema,
          as: 'client',
          attributes: ['uuid', 'name', 'type']
        },
        {
          model: AuthSchema,
          as: 'manager',
          attributes: ['uuid', 'name', 'email']
        }
      ]
    })
  }

  async deleteByUuid(uuid: string, companyId?: number): Promise<number> {
    return ProjectSchema.destroy({
      where: {
        uuid,
        ...(companyId ? { company_id: companyId } : {})
      }
    })
  }
}

export default new ProjectModel()
