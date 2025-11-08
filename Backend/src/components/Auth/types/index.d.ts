declare namespace AuthType {
  export type IAuthType = {
    id?: number
    name: string
    email?: string
    password_hash?: string
    role?: 'admin' | 'project_manager' | 'team_member' | 'finance'
    hourly_rate?: number
    created_at?: Date
    updated_at?: Date
  }

  export type JwtPayload = {
    id: number
    email: string
    role: 'admin' | 'project_manager' | 'team_member' | 'finance'
  }
}

export = AuthType
