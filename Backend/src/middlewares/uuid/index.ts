import express, { Response, NextFunction } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { CustomRequest } from '../../environment'

/**
 * Generate a new UUID
 */
export const generateUUID = (): string => uuidv4()

/**
 * Validate UUID format
 */
export const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

/**
 * Generate short UUID (8 characters)
 */
export const generateShortUUID = (): string => uuidv4().replace(/-/g, '').substring(0, 8)

export default (app: express.Application) => {
  app.use((req: CustomRequest, res: Response, next: NextFunction) => {
    // Generate or use existing request ID
    const requestId = (req.headers['x-request-id'] as string) || uuidv4()

    // Attach request ID to request object (maintaining backward compatibility)
    if (!req.custom) {
      req.custom = { request_uuid: requestId }
    } else if (!req.custom.request_uuid) {
      req.custom.request_uuid = requestId
    }

    // Set response header
    res.setHeader('X-Request-ID', requestId)

    next()
  })
}
