declare namespace ExpressEnvironment {
  export type ICustomRequestObject = {
    request_uuid: string
    company_id?: string
    user_id?: number
    role_id?: string
    permissions?: any
    subscription_plan?: string
    keycloak_uuid?: string
  }
}

export = ExpressEnvironment
