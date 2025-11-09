import {
  AuthTokens,
  AuthUser,
  Contact,
  ContactType,
  ExpensesListResponse,
  Expense,
  InvoicesListResponse,
  Invoice,
  ProjectsListResponse,
  Project,
  PurchaseOrdersListResponse,
  PurchaseOrder,
  SalesOrdersListResponse,
  SalesOrder,
  TasksListResponse,
  Task,
  TimesheetsListResponse,
  TimesheetEntry,
  UserRole,
  VendorBillsListResponse,
  VendorBill,
  ContactsListResponse,
  UsersListResponse,
  AnalyticsDashboardResponse
} from './types'

const DEFAULT_API_BASE_URL = 'http://localhost:3000'
const DEFAULT_API_PREFIX = '/oneflow/api/v1'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL).replace(/\/$/, '')
const API_PREFIX = ('/' + (import.meta.env.VITE_API_PREFIX ?? DEFAULT_API_PREFIX).replace(/^\/?/, '')).replace(/\/$/, '')

const TOKEN_STORAGE_KEY = 'oneflow.auth.token'
const USER_STORAGE_KEY = 'oneflow.auth.user'

export class ApiError extends Error {
  status: number
  payload: unknown

  constructor(status: number, message: string, payload?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

export interface ApiSuccess<T> {
  status: number
  message: string
  data: T
  pager?: unknown
}

type QueryValue = string | number | boolean | undefined | null | string[]

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  query?: Record<string, QueryValue>
  headers?: Record<string, string>
  skipAuth?: boolean
}

const buildUrl = (path: string, query?: Record<string, QueryValue>) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const url = new URL(`${API_BASE_URL}${API_PREFIX}${normalizedPath}`)

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null) return
      if (Array.isArray(value)) {
        if (value.length > 0) {
          url.searchParams.append(key, value.join(','))
        }
        return
      }
      url.searchParams.append(key, String(value))
    })
  }

  return url.toString()
}

const isJsonResponse = (response: Response) => {
  const contentType = response.headers.get('content-type')
  return contentType ? contentType.includes('application/json') : false
}

export const getStoredToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY)
  } catch (error) {
    console.warn('Unable to read auth token from storage', error)
    return null
  }
}

export const persistToken = (token: string | null) => {
  try {
    if (!token) {
      localStorage.removeItem(TOKEN_STORAGE_KEY)
    } else {
      localStorage.setItem(TOKEN_STORAGE_KEY, token)
    }
  } catch (error) {
    console.warn('Unable to persist auth token', error)
  }
}

export const getStoredUser = (): AuthUser | null => {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as AuthUser
  } catch (error) {
    console.warn('Unable to parse stored user', error)
    return null
  }
}

export const persistUser = (user: AuthUser | null) => {
  try {
    if (!user) {
      localStorage.removeItem(USER_STORAGE_KEY)
    } else {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
    }
  } catch (error) {
    console.warn('Unable to persist user', error)
  }
}

export const clearStoredAuth = () => {
  persistToken(null)
  persistUser(null)
}

export const request = async <T>(path: string, options: RequestOptions = {}): Promise<ApiSuccess<T>> => {
  const { method = 'GET', body, query, headers = {}, skipAuth = false } = options
  const url = buildUrl(path, query)

  const finalHeaders = new Headers(headers)

  if (body !== undefined && body !== null && !finalHeaders.has('Content-Type')) {
    finalHeaders.set('Content-Type', 'application/json')
  }

  if (!skipAuth) {
    const token = getStoredToken()
    if (token && !finalHeaders.has('Authorization')) {
      finalHeaders.set('Authorization', `Bearer ${token}`)
    }
  }

  const fetchOptions: RequestInit = {
    method,
    headers: finalHeaders
  }

  if (body !== undefined && body !== null) {
    fetchOptions.body = JSON.stringify(body)
  }

  const response = await fetch(url, fetchOptions)

  let parsed: any = null
  if (isJsonResponse(response)) {
    parsed = await response.json()
  } else {
    const text = await response.text()
    parsed = text ? { status: response.status, message: text } : null
  }

  if (!response.ok) {
    const message = parsed?.message ?? response.statusText ?? 'Request failed'
    throw new ApiError(response.status, message, parsed)
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new ApiError(response.status, 'Invalid response payload', parsed)
  }

  return parsed as ApiSuccess<T>
}

export const login = async (email: string, password: string): Promise<AuthTokens> => {
  const response = await request<AuthTokens>('/Auth/login', {
    method: 'POST',
    body: { email, password },
    skipAuth: true
  })
  return response.data
}

export const signup = async (name: string, email: string, password: string, companyName: string): Promise<AuthTokens> => {
  const response = await request<AuthTokens>('/Auth/signup', {
    method: 'POST',
    body: { name, email, password, company_name: companyName },
    skipAuth: true
  })
  return response.data
}

export const fetchCurrentUser = async (): Promise<AuthUser> => {
  const response = await request<{ user: AuthUser }>('/Auth/me')
  return response.data.user
}

export interface ProjectsListParams {
  limit?: number
  page?: number
  status?: string | string[]
  search?: string
  client_uuid?: string
  manager_uuid?: string
}

export const listProjects = async (params: ProjectsListParams = {}): Promise<ProjectsListResponse> => {
  const { status, ...rest } = params
  const query = {
    ...rest,
    ...(status ? { status: Array.isArray(status) ? status : [status] } : {})
  }
  const response = await request<ProjectsListResponse>('/Projects', { query })
  return response.data
}

export const getProject = async (uuid: string): Promise<Project> => {
  const response = await request<Project>(`/Projects/${uuid}`)
  return response.data
}

export interface TasksListParams {
  limit?: number
  page?: number
  status?: string | string[]
  priority?: string | string[]
  project_uuid?: string
  assignee_uuid?: string
  search?: string
}

export const listTasks = async (params: TasksListParams = {}): Promise<TasksListResponse> => {
  const { status, priority, ...rest } = params
  const query = {
    ...rest,
    ...(status ? { status: Array.isArray(status) ? status : [status] } : {}),
    ...(priority ? { priority: Array.isArray(priority) ? priority : [priority] } : {})
  }
  const response = await request<TasksListResponse>('/Tasks', { query })
  return response.data
}

export const getTask = async (uuid: string): Promise<Task> => {
  const response = await request<Task>(`/Tasks/${uuid}`)
  return response.data
}

export interface TimesheetsListParams {
  limit?: number
  page?: number
  project_uuid?: string
  task_uuid?: string
  user_uuid?: string
  billable?: boolean
  date_from?: string
  date_to?: string
  search?: string
}

export const listTimesheets = async (params: TimesheetsListParams = {}): Promise<TimesheetsListResponse> => {
  const response = await request<TimesheetsListResponse>('/Timesheets', { query: params })
  return response.data
}

export const getTimesheet = async (uuid: string): Promise<TimesheetEntry> => {
  const response = await request<TimesheetEntry>(`/Timesheets/${uuid}`)
  return response.data
}

export interface SalesOrdersListParams {
  limit?: number
  page?: number
  project_uuid?: string
  client_uuid?: string
  status?: string | string[]
  date_from?: string
  date_to?: string
  search?: string
}

export const listSalesOrders = async (params: SalesOrdersListParams = {}): Promise<SalesOrdersListResponse> => {
  const { status, ...rest } = params
  const response = await request<SalesOrdersListResponse>('/SalesOrders', {
    query: {
      ...rest,
      ...(status ? { status: Array.isArray(status) ? status : [status] } : {})
    }
  })
  return response.data
}

export const getSalesOrder = async (uuid: string): Promise<SalesOrder> => {
  const response = await request<SalesOrder>(`/SalesOrders/${uuid}`)
  return response.data
}

export interface PurchaseOrdersListParams {
  limit?: number
  page?: number
  project_uuid?: string
  vendor_uuid?: string
  status?: string | string[]
  date_from?: string
  date_to?: string
  search?: string
}

export const listPurchaseOrders = async (params: PurchaseOrdersListParams = {}): Promise<PurchaseOrdersListResponse> => {
  const { status, ...rest } = params
  const response = await request<PurchaseOrdersListResponse>('/PurchaseOrders', {
    query: {
      ...rest,
      ...(status ? { status: Array.isArray(status) ? status : [status] } : {})
    }
  })
  return response.data
}

export const getPurchaseOrder = async (uuid: string): Promise<PurchaseOrder> => {
  const response = await request<PurchaseOrder>(`/PurchaseOrders/${uuid}`)
  return response.data
}

export interface InvoicesListParams {
  limit?: number
  page?: number
  project_uuid?: string
  sales_order_uuid?: string
  client_uuid?: string
  status?: string | string[]
  date_from?: string
  date_to?: string
  search?: string
}

export const listInvoices = async (params: InvoicesListParams = {}): Promise<InvoicesListResponse> => {
  const { status, ...rest } = params
  const response = await request<InvoicesListResponse>('/Invoices', {
    query: {
      ...rest,
      ...(status ? { status: Array.isArray(status) ? status : [status] } : {})
    }
  })
  return response.data
}

export const getInvoice = async (uuid: string): Promise<Invoice> => {
  const response = await request<Invoice>(`/Invoices/${uuid}`)
  return response.data
}

export interface VendorBillsListParams {
  limit?: number
  page?: number
  project_uuid?: string
  purchase_order_uuid?: string
  vendor_uuid?: string
  status?: string | string[]
  date_from?: string
  date_to?: string
  search?: string
}

export const listVendorBills = async (params: VendorBillsListParams = {}): Promise<VendorBillsListResponse> => {
  const { status, ...rest } = params
  const response = await request<VendorBillsListResponse>('/VendorBills', {
    query: {
      ...rest,
      ...(status ? { status: Array.isArray(status) ? status : [status] } : {})
    }
  })
  return response.data
}

export const getVendorBill = async (uuid: string): Promise<VendorBill> => {
  const response = await request<VendorBill>(`/VendorBills/${uuid}`)
  return response.data
}

export interface ExpensesListParams {
  limit?: number
  page?: number
  project_uuid?: string
  user_uuid?: string
  status?: string | string[]
  billable?: boolean
  date_from?: string
  date_to?: string
  search?: string
}

export const listExpenses = async (params: ExpensesListParams = {}): Promise<ExpensesListResponse> => {
  const { status, ...rest } = params
  const response = await request<ExpensesListResponse>('/Expenses', {
    query: {
      ...rest,
      ...(status ? { status: Array.isArray(status) ? status : [status] } : {})
    }
  })
  return response.data
}

export const getExpense = async (uuid: string): Promise<Expense> => {
  const response = await request<Expense>(`/Expenses/${uuid}`)
  return response.data
}

export interface ContactsListParams {
  limit?: number
  page?: number
  type?: string
  search?: string
}

export const listContacts = async (params: ContactsListParams = {}): Promise<ContactsListResponse> => {
  const response = await request<ContactsListResponse>('/Contacts', { query: params })
  return response.data
}

export interface CreateContactPayload {
  name: string
  type: ContactType
  email?: string | null
  phone?: string | null
  address?: string | null
}

export interface UpdateContactPayload {
  name?: string
  type?: ContactType
  email?: string | null
  phone?: string | null
  address?: string | null
}

export const createContact = async (payload: CreateContactPayload): Promise<Contact> => {
  const response = await request<Contact>('/Contacts', {
    method: 'POST',
    body: payload
  })
  return response.data
}

export const updateContact = async (uuid: string, payload: UpdateContactPayload): Promise<Contact> => {
  const response = await request<Contact>(`/Contacts/${uuid}`, {
    method: 'PUT',
    body: payload
  })
  return response.data
}

export const deleteContact = async (uuid: string): Promise<void> => {
  await request<Record<string, never>>(`/Contacts/${uuid}`, { method: 'DELETE' })
}

export const getContact = async (uuid: string): Promise<Contact> => {
  const response = await request<Contact>(`/Contacts/${uuid}`)
  return response.data
}

export interface UsersListParams {
  limit?: number
  page?: number
  search?: string
}

export const listUsers = async (params: UsersListParams = {}): Promise<UsersListResponse> => {
  const response = await request<UsersListResponse>('/Auth/users', { query: params })
  return response.data
}

export interface CreateUserPayload {
  name: string
  email: string
  password: string
  role: UserRole
  hourly_rate?: number
}

export interface UpdateUserPayload {
  name?: string
  email?: string
  password?: string
  role?: UserRole
  hourly_rate?: number
}

export const createUser = async (payload: CreateUserPayload): Promise<AuthUser> => {
  const response = await request<AuthUser>('/Auth/users', {
    method: 'POST',
    body: payload
  })
  return response.data
}

export const updateUser = async (id: number, payload: UpdateUserPayload): Promise<AuthUser> => {
  const response = await request<AuthUser>(`/Auth/users/${id}`, {
    method: 'PUT',
    body: payload
  })
  return response.data
}

export const deleteUser = async (id: number): Promise<void> => {
  await request<Record<string, never>>(`/Auth/users/${id}`, { method: 'DELETE' })
}

export const getAnalyticsDashboard = async (): Promise<AnalyticsDashboardResponse> => {
  const response = await request<AnalyticsDashboardResponse>('/Analytics/dashboard')
  return response.data
}

export interface CreateProjectPayload {
  name: string
  description?: string
  client_uuid?: string
  manager_uuid?: string
  status?: string
  start_date?: string | null
  end_date?: string | null
  budget?: number
}

export const createProject = async (payload: CreateProjectPayload): Promise<Project> => {
  const response = await request<Project>('/Projects', {
    method: 'POST',
    body: payload
  })
  return response.data
}

export interface CreateTaskPayload {
  project_uuid: string
  title: string
  description?: string
  status?: string
  priority?: string
  assignee_uuid?: string | null
  due_date?: string | null
  assigned_user_uuids?: string[]
}

export const createTask = async (payload: CreateTaskPayload): Promise<Task> => {
  const response = await request<Task>('/Tasks', {
    method: 'POST',
    body: payload
  })
  return response.data
}

export interface UpdateTaskPayload {
  title?: string
  description?: string | null
  status?: string
  priority?: string
  assignee_uuid?: string | null
  due_date?: string | null
  assigned_user_uuids?: string[]
}

export const updateTask = async (uuid: string, payload: UpdateTaskPayload): Promise<Task> => {
  const response = await request<Task>(`/Tasks/${uuid}`, {
    method: 'PUT',
    body: payload
  })
  return response.data
}

export interface CreateTimesheetPayload {
  project_uuid: string
  task_uuid?: string | null
  user_uuid: string
  date: string
  hours: number
  description?: string
  billable?: boolean
  cost_rate?: number
}

export const createTimesheet = async (payload: CreateTimesheetPayload): Promise<TimesheetEntry> => {
  const response = await request<TimesheetEntry>('/Timesheets', {
    method: 'POST',
    body: payload
  })
  return response.data
}

export interface CreateSalesOrderPayload {
  project_uuid?: string | null
  client_uuid?: string | null
  date: string
  status?: string
  items?: Record<string, any>[]
  total_amount: number
}

export const createSalesOrder = async (payload: CreateSalesOrderPayload): Promise<SalesOrder> => {
  const response = await request<SalesOrder>('/SalesOrders', {
    method: 'POST',
    body: payload
  })
  return response.data
}

export interface UpdateSalesOrderPayload {
  client_uuid?: string | null
  status?: string
  date?: string
  total_amount?: number
  items?: Record<string, any>[]
}

export const updateSalesOrder = async (uuid: string, payload: UpdateSalesOrderPayload): Promise<SalesOrder> => {
  const response = await request<SalesOrder>(`/SalesOrders/${uuid}`, {
    method: 'PUT',
    body: payload
  })
  return response.data
}

export interface CreatePurchaseOrderPayload {
  project_uuid?: string | null
  vendor_uuid?: string | null
  date: string
  status?: string
  items?: Record<string, any>[]
  total_amount: number
}

export const createPurchaseOrder = async (payload: CreatePurchaseOrderPayload): Promise<PurchaseOrder> => {
  const response = await request<PurchaseOrder>('/PurchaseOrders', {
    method: 'POST',
    body: payload
  })
  return response.data
}

export interface UpdatePurchaseOrderPayload {
  vendor_uuid?: string | null
  status?: string
  date?: string
  total_amount?: number
  items?: Record<string, any>[]
}

export const updatePurchaseOrder = async (uuid: string, payload: UpdatePurchaseOrderPayload): Promise<PurchaseOrder> => {
  const response = await request<PurchaseOrder>(`/PurchaseOrders/${uuid}`, {
    method: 'PUT',
    body: payload
  })
  return response.data
}

export interface CreateInvoicePayload {
  project_uuid?: string | null
  sales_order_uuid?: string | null
  client_uuid?: string | null
  date: string
  due_date?: string | null
  status?: string
  items?: Record<string, any>[]
  total_amount: number
}

export const createInvoice = async (payload: CreateInvoicePayload): Promise<Invoice> => {
  const response = await request<Invoice>('/Invoices', {
    method: 'POST',
    body: payload
  })
  return response.data
}

export interface UpdateInvoicePayload {
  client_uuid?: string | null
  sales_order_uuid?: string | null
  status?: string
  date?: string
  due_date?: string | null
  total_amount?: number
  items?: Record<string, any>[]
}

export const updateInvoice = async (uuid: string, payload: UpdateInvoicePayload): Promise<Invoice> => {
  const response = await request<Invoice>(`/Invoices/${uuid}`, {
    method: 'PUT',
    body: payload
  })
  return response.data
}

export interface CreateVendorBillPayload {
  project_uuid?: string | null
  purchase_order_uuid?: string | null
  vendor_uuid?: string | null
  date: string
  due_date?: string | null
  status?: string
  items?: Record<string, any>[]
  total_amount: number
}

export const createVendorBill = async (payload: CreateVendorBillPayload): Promise<VendorBill> => {
  const response = await request<VendorBill>('/VendorBills', {
    method: 'POST',
    body: payload
  })
  return response.data
}

export interface UpdateVendorBillPayload {
  vendor_uuid?: string | null
  purchase_order_uuid?: string | null
  status?: string
  date?: string
  due_date?: string | null
  total_amount?: number
  items?: Record<string, any>[]
}

export const updateVendorBill = async (uuid: string, payload: UpdateVendorBillPayload): Promise<VendorBill> => {
  const response = await request<VendorBill>(`/VendorBills/${uuid}`, {
    method: 'PUT',
    body: payload
  })
  return response.data
}

export interface CreateExpensePayload {
  project_uuid: string
  user_uuid?: string | null
  description: string
  amount: number
  date: string
  billable?: boolean
  status?: string
  receipt_url?: string | null
}

export const createExpense = async (payload: CreateExpensePayload): Promise<Expense> => {
  const response = await request<Expense>('/Expenses', {
    method: 'POST',
    body: payload
  })
  return response.data
}

export interface UpdateExpensePayload {
  user_uuid?: string | null
  description?: string
  amount?: number
  date?: string
  status?: string
  billable?: boolean
  receipt_url?: string | null
}

export const updateExpense = async (uuid: string, payload: UpdateExpensePayload): Promise<Expense> => {
  const response = await request<Expense>(`/Expenses/${uuid}`, {
    method: 'PUT',
    body: payload
  })
  return response.data
}

