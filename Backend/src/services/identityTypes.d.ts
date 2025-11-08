declare namespace Authorize {
  interface IUser {
    id: number
    user_id: number
    uuid: string
    email: string
    full_name: string
    phone?: string
    company_id?: number
    role_id?: number
    role_type?: string
    is_active: boolean
    created_at: Date
    updated_at: Date
    deleted_at?: Date
  }

  interface ICompany {
    id: number
    name: string
    email: string
    phone: string
    logo: string
    country: string
    state: string
    city: string
    subscription_plan: string
    active_subscription_id?: string
    created_at: Date
    deleted_at?: Date
  }

  interface IRole {
    id: number
    name: string
    role_type: string
    permissions: any // JSONB permissions object
    company_id?: number
    created_at: Date
  }

  interface ResponseObj {
    user: IUser
    company?: ICompany
    role?: IRole
  }
}

export default Authorize
