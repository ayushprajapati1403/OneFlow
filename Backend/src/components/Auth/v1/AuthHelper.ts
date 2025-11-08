import jwt from 'jsonwebtoken'
import { AuthSchema } from '../schema/AuthSchema'
import { ROLE_TYPES } from '../../../utils/constants'

type Role = (typeof ROLE_TYPES)[keyof typeof ROLE_TYPES]

class AuthHelper {
  sanitizeUser(user: AuthSchema) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      hourly_rate: Number(user.hourly_rate),
      created_at: user.created_at,
      updated_at: user.updated_at
    }
  }

  generateAccessToken(user: AuthSchema): string {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role as Role
    }

    const secret = process.env.JWT_SECRET
    if (!secret) {
      throw new Error('JWT_SECRET is not configured')
    }

    const expiresIn = process.env.JWT_EXPIRES_IN ?? '24h'
    return jwt.sign(payload, secret, { expiresIn })
  }

  verifyAccessToken(token: string) {
    const secret = process.env.JWT_SECRET
    if (!secret) {
      throw new Error('JWT_SECRET is not configured')
    }
    return jwt.verify(token, secret)
  }
}

export default new AuthHelper()
