import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { AuthSchema } from '../schema/AuthSchema'
import { ROLE_TYPES } from '../../../utils/constants'

type Role = (typeof ROLE_TYPES)[keyof typeof ROLE_TYPES]

class AuthHelper {
  private readonly saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 12)

  sanitizeUser(user: AuthSchema) {
    return {
      id: user.id,
      uuid: user.uuid,
      name: user.name,
      email: user.email,
      role: user.role,
      company_id: user.company_id,
      hourly_rate: Number(user.hourly_rate),
      created_at: user.created_at,
      updated_at: user.updated_at
    }
  }

  generateAccessToken(user: AuthSchema): string {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role as Role,
      company_id: user.company_id
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

  async hashPassword(password: string): Promise<string> {
    if (!password) {
      throw new Error('Password is required for hashing')
    }
    return bcrypt.hash(password, this.saltRounds)
  }
}

export default new AuthHelper()
