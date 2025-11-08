declare module '../../lib/smartapi-connect' {
  export class SmartAPI {
    constructor(params: { api_key: string; client_code?: string; root?: string; timeout?: number; debug?: boolean; access_token?: string; refresh_token?: string })

    generateSession(clientCode: string, password: string, totp: string): Promise<any>
    getProfile(): Promise<any>
    placeOrder(orderData: any): Promise<any>
    getHolding(): Promise<any>
    getPosition(): Promise<any>
    cancelOrder(orderId: string): Promise<any>
  }
}
