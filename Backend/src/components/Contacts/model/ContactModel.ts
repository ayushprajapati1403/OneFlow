import { FindOptions, Op, WhereOptions } from 'sequelize'
import ContactSchema, { ContactType } from '../schema/ContactSchema'

export interface ContactListOptions {
  search?: string
  type?: ContactType
  limit?: number
  offset?: number
  attributes?: FindOptions['attributes']
  company_id?: number
}

class ContactModel {
  async createContact(payload: {
    name: string
    type: ContactType
    email?: string | null
    phone?: string | null
    address?: string | null
    company_id: number
  }): Promise<ContactSchema> {
    return ContactSchema.create(payload)
  }

  async findByUuid(uuid: string, company_id?: number): Promise<ContactSchema | null> {
    return ContactSchema.findOne({
      where: {
        uuid,
        ...(company_id ? { company_id } : {})
      }
    })
  }

  async findById(id: number, company_id?: number): Promise<ContactSchema | null> {
    return ContactSchema.findOne({
      where: {
        id,
        ...(company_id ? { company_id } : {})
      }
    })
  }

  async listContacts(options: ContactListOptions = {}): Promise<{ rows: ContactSchema[]; count: number }> {
    const where: WhereOptions = {}

    if (options.company_id) {
      Object.assign(where, { company_id: options.company_id })
    }

    if (options.type) {
      Object.assign(where, { type: options.type })
    }

    if (options.search?.trim()) {
      const term = `%${options.search.trim()}%`
      Object.assign(where, {
        [Op.or]: [{ name: { [Op.iLike]: term } }, { email: { [Op.iLike]: term } }]
      })
    }

    return ContactSchema.findAndCountAll({
      where,
      attributes: options.attributes,
      limit: options.limit,
      offset: options.offset,
      order: [['created_at', 'DESC']]
    })
  }

  async updateByUuid(
    uuid: string,
    payload: {
      name?: string
      type?: ContactType
      email?: string | null
      phone?: string | null
      address?: string | null
    },
    company_id?: number
  ): Promise<ContactSchema | null> {
    const [updated, rows] = await ContactSchema.update(payload, {
      where: {
        uuid,
        ...(company_id ? { company_id } : {})
      },
      returning: true,
      individualHooks: true
    })

    if (!updated) return null
    return rows[0]
  }

  async deleteByUuid(uuid: string, company_id?: number): Promise<number> {
    return ContactSchema.destroy({
      where: {
        uuid,
        ...(company_id ? { company_id } : {})
      }
    })
  }
}

export default new ContactModel()
