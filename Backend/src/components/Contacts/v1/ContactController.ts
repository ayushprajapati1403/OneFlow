import STATUS_CODES from 'http-status-codes'
import { CustomRequest, CustomResponse } from '../../../environment'
import { createResponse, createResponse1 } from '../../../utils/helper'
import { logger } from '../../../utils/logger'
import ContactModel from '../model/ContactModel'
import { ContactSchema, ContactType } from '../schema/ContactSchema'

const DEFAULT_LIMIT = 20

class ContactController {
  private normalizeType(value: unknown): ContactType | undefined {
    if (typeof value !== 'string') return undefined
    const lowered = value.toLowerCase()
    if (['client', 'vendor', 'both'].includes(lowered)) {
      return lowered as ContactType
    }
    return undefined
  }

  private sanitize(contact: ContactSchema) {
    return {
      id: contact.id,
      uuid: contact.uuid,
      name: contact.name,
      type: contact.type,
      email: contact.email,
      phone: contact.phone,
      address: contact.address,
      created_at: contact.created_at,
      updated_at: contact.updated_at
    }
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
      const limit = Math.max(Number(req.query.limit ?? DEFAULT_LIMIT), 1)
      const offset = (page - 1) * limit
      const type = this.normalizeType(req.query.type)
      const search = req.query.search as string | undefined

      const { rows, count } = await ContactModel.listContacts({ limit, offset, type, search, company_id: companyId })

      return createResponse(res, STATUS_CODES.OK, res.__('CONTACT.LIST_SUCCESS'), {
        contacts: rows.map((row) => this.sanitize(row)),
        pagination: {
          total: count,
          page,
          limit
        }
      })
    } catch (error) {
      logger.error(__filename, 'list', req.custom?.request_uuid, 'Error listing contacts', error)
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
        return createResponse1({
          res,
          status: STATUS_CODES.FORBIDDEN,
          message: 'Company context is required.'
        })
      }

      const { name, type, email, phone, address } = req.body
      const normalizedType = this.normalizeType(type)
      if (!normalizedType) {
        return createResponse1({
          res,
          status: STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: res.__('VALIDATIONS.invalid', 'type')
        })
      }

      const contact = await ContactModel.createContact({
        name,
        type: normalizedType,
        email,
        phone,
        address,
        company_id: companyId
      })

      return createResponse(res, STATUS_CODES.CREATED, res.__('CONTACT.CREATE_SUCCESS'), this.sanitize(contact))
    } catch (error) {
      logger.error(__filename, 'create', req.custom?.request_uuid, 'Error creating contact', error)
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
        return createResponse1({
          res,
          status: STATUS_CODES.FORBIDDEN,
          message: 'Company context is required.'
        })
      }

      const contact = await ContactModel.findByUuid(uuid, companyId)

      if (!contact) {
        return createResponse1({
          res,
          status: STATUS_CODES.NOT_FOUND,
          message: res.__('CONTACT.NOT_FOUND')
        })
      }

      return createResponse(res, STATUS_CODES.OK, res.__('CONTACT.DETAIL_SUCCESS'), this.sanitize(contact))
    } catch (error) {
      logger.error(__filename, 'get', req.custom?.request_uuid, 'Error fetching contact', error)
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

      const companyId = req.user?.company_id
      if (!companyId) {
        return createResponse1({
          res,
          status: STATUS_CODES.FORBIDDEN,
          message: 'Company context is required.'
        })
      }

      const existing = await ContactModel.findByUuid(uuid, companyId)
      if (!existing) {
        return createResponse1({
          res,
          status: STATUS_CODES.NOT_FOUND,
          message: res.__('CONTACT.NOT_FOUND')
        })
      }

      const payload: {
        name?: string
        type?: ContactType
        email?: string | null
        phone?: string | null
        address?: string | null
      } = {}

      if (req.body.name !== undefined) payload.name = req.body.name
      if (req.body.email !== undefined) payload.email = req.body.email
      if (req.body.phone !== undefined) payload.phone = req.body.phone
      if (req.body.address !== undefined) payload.address = req.body.address

      if (req.body.type !== undefined) {
        const normalizedType = this.normalizeType(req.body.type)
        if (!normalizedType) {
          return createResponse1({
            res,
            status: STATUS_CODES.UNPROCESSABLE_ENTITY,
            message: res.__('VALIDATIONS.invalid', 'type')
          })
        }
        payload.type = normalizedType
      }

      const updated = await ContactModel.updateByUuid(uuid, payload, companyId)
      if (!updated) {
        return createResponse1({
          res,
          status: STATUS_CODES.INTERNAL_SERVER_ERROR,
          message: res.__('SERVER_ERROR_MESSAGE')
        })
      }

      return createResponse(res, STATUS_CODES.OK, res.__('CONTACT.UPDATE_SUCCESS'), this.sanitize(updated))
    } catch (error) {
      logger.error(__filename, 'update', req.custom?.request_uuid, 'Error updating contact', error)
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
        return createResponse1({
          res,
          status: STATUS_CODES.FORBIDDEN,
          message: 'Company context is required.'
        })
      }

      const deleted = await ContactModel.deleteByUuid(uuid, companyId)
      if (!deleted) {
        return createResponse1({
          res,
          status: STATUS_CODES.NOT_FOUND,
          message: res.__('CONTACT.NOT_FOUND')
        })
      }

      return createResponse1({
        res,
        status: STATUS_CODES.OK,
        message: res.__('CONTACT.DELETE_SUCCESS')
      })
    } catch (error) {
      logger.error(__filename, 'remove', req.custom?.request_uuid, 'Error deleting contact', error)
      return createResponse1({
        res,
        status: STATUS_CODES.INTERNAL_SERVER_ERROR,
        message: res.__('SERVER_ERROR_MESSAGE')
      })
    }
  }
}

export default new ContactController()
