import { FindOptions, Op } from 'sequelize'
import AuthSchema from '../schema/AuthSchema'

type CreateUserAttributes = {
  name: string
  email: string
  password_hash: string
  role?: AuthSchema['role']
  hourly_rate?: number
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

  async findById(id: number): Promise<AuthSchema | null> {
    return AuthSchema.findByPk(id)
  }

  async listUsers(options: UserQueryOptions = {}): Promise<{ rows: AuthSchema[]; count: number }> {
    const where = options.search
      ? {
          [Op.or]: [
            { name: { [Op.iLike]: `%${options.search.trim()}%` } },
            { email: { [Op.iLike]: `%${options.search.trim()}%` } }
          ]
        }
      : undefined

    return AuthSchema.findAndCountAll({
      where,
      attributes: options.attributes,
      limit: options.limit,
      offset: options.offset,
      order: [['created_at', 'DESC']]
    })
  }

  async updateById(id: number, data: UpdateUserAttributes): Promise<AuthSchema | null> {
    const [updatedCount, rows] = await AuthSchema.update(data, {
      where: { id },
      returning: true,
      individualHooks: true
    })

    if (!updatedCount) {
      return null
    }

    return rows[0]
  }

  async deleteById(id: number): Promise<number> {
    return AuthSchema.destroy({ where: { id } })
  }
}

export default new AuthModel()
