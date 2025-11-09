import { FindOptions, Op } from 'sequelize'
import AuthSchema from '../schema/AuthSchema'

type CreateUserAttributes = {
  name: string
  email: string
  password_hash: string
  role?: AuthSchema['role']
  hourly_rate?: number
  company_id?: number | null
}
type UpdateUserAttributes = Partial<CreateUserAttributes>

export interface UserQueryOptions {
  search?: string
  limit?: number
  offset?: number
  attributes?: FindOptions['attributes']
}

class AuthModel {
  async createUser(data: CreateUserAttributes): Promise<AuthSchema> {
    return AuthSchema.create(data)
  }

  async findByEmail(email: string): Promise<AuthSchema | null> {
    return AuthSchema.findOne({ where: { email } })
  }

  async findByUuid(uuid: string, company_id?: number): Promise<AuthSchema | null> {
    return AuthSchema.findOne({
      where: {
        uuid,
        ...(company_id ? { company_id } : {})
      }
    })
  }

  async findByUuids(uuids: string[], company_id?: number): Promise<AuthSchema[]> {
    if (!uuids.length) return []
    return AuthSchema.findAll({
      where: {
        uuid: uuids,
        ...(company_id ? { company_id } : {})
      }
    })
  }

  async findById(id: number, company_id?: number): Promise<AuthSchema | null> {
    return AuthSchema.findOne({
      where: {
        id,
        ...(company_id ? { company_id } : {})
      }
    })
  }

  async listUsers(options: UserQueryOptions & { company_id?: number } = {}): Promise<{ rows: AuthSchema[]; count: number }> {
    const conditions: any = {}

    if (options.search?.trim()) {
      const term = `%${options.search.trim()}%`
      conditions[Op.or] = [{ name: { [Op.iLike]: term } }, { email: { [Op.iLike]: term } }]
        }

    if (options.company_id) {
      conditions.company_id = options.company_id
    }

    return AuthSchema.findAndCountAll({
      where: Object.keys(conditions).length ? conditions : undefined,
      attributes: options.attributes,
      limit: options.limit,
      offset: options.offset,
      order: [['created_at', 'DESC']]
    })
  }

  async updateById(id: number, data: UpdateUserAttributes, company_id?: number): Promise<AuthSchema | null> {
    const [updatedCount, rows] = await AuthSchema.update(data, {
      where: {
        id,
        ...(company_id ? { company_id } : {})
      },
      returning: true,
      individualHooks: true
    })

    if (!updatedCount) {
      return null
    }

    return rows[0]
  }

  async deleteById(id: number, company_id?: number): Promise<number> {
    return AuthSchema.destroy({
      where: {
        id,
        ...(company_id ? { company_id } : {})
      }
    })
  }
}

export default new AuthModel()
