export type UserRole = 'admin' | 'project_manager' | 'team_member' | 'finance'

export interface AuthUser {
  id: number
  uuid: string
  name: string
  email: string
  role: UserRole
  hourly_rate: number
  created_at: string
  updated_at: string
}

export interface AuthTokens {
  token: string
  user: AuthUser
}

export interface Pagination {
  total: number
  page: number
  limit: number
}

export interface ProjectClient {
  uuid: string
  name: string
  type: string
}

export interface ProjectManager {
  uuid: string
  name: string
  email: string
}

export type ProjectStatus = 'planned' | 'active' | 'on_hold' | 'completed'

export interface Project {
  uuid: string
  name: string
  description: string | null
  status: ProjectStatus
  client: ProjectClient | null
  manager: ProjectManager | null
  start_date: string | null
  end_date: string | null
  budget: number
  created_at: string
  updated_at: string
  budget_spent?: number
}

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'

export interface TaskAssignmentUser {
  uuid: string
  name: string
  email: string
}

export interface TaskAssignment {
  uuid: string
  user: TaskAssignmentUser
  assigned_at: string
}

export interface TaskProjectSummary {
  uuid: string
  name: string
  status: string
}

export interface Task {
  uuid: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  project: TaskProjectSummary
  assignee: TaskAssignmentUser | null
  assignments: TaskAssignment[]
  created_at: string
  updated_at: string
  attachment_count?: number
}

export interface TimesheetProject {
  uuid: string
  name: string
}

export interface TimesheetTask {
  uuid: string
  title: string
}

export interface TimesheetUser {
  uuid: string
  name: string
  email: string
  hourly_rate: number
}

export interface TimesheetEntry {
  uuid: string
  project: TimesheetProject
  task: TimesheetTask | null
  user: TimesheetUser
  date: string
  hours: number
  description: string | null
  billable: boolean
  cost_rate: number
  cost_total: number
  created_at: string
}

export type SalesOrderStatus = 'draft' | 'sent' | 'approved' | 'paid' | 'declined'

export interface SalesOrderParty {
  uuid: string
  name: string
  type: string
}

export interface SalesOrder {
  uuid: string
  project: TimesheetProject | null
  client: SalesOrderParty | null
  date: string
  status: SalesOrderStatus
  items: Record<string, any>[]
  total_amount: number
  created_at: string
  updated_at: string
}

export type PurchaseOrderStatus = 'draft' | 'sent' | 'approved' | 'paid' | 'declined'

export interface PurchaseOrderVendor {
  uuid: string
  name: string
  type: string
}

export interface PurchaseOrder {
  uuid: string
  project: TimesheetProject | null
  vendor: PurchaseOrderVendor | null
  date: string
  status: PurchaseOrderStatus
  items: Record<string, any>[]
  total_amount: number
  created_at: string
  updated_at: string
}

export type InvoiceStatus = 'draft' | 'sent' | 'approved' | 'paid' | 'declined'

export interface Invoice {
  uuid: string
  project: TimesheetProject | null
  sales_order: { uuid: string } | null
  client: SalesOrderParty | null
  date: string
  due_date: string | null
  status: InvoiceStatus
  items: Record<string, any>[]
  total_amount: number
  created_at: string
  updated_at: string
}

export type VendorBillStatus = 'draft' | 'sent' | 'approved' | 'paid' | 'declined'

export interface VendorBill {
  uuid: string
  project: TimesheetProject | null
  purchase_order: { uuid: string } | null
  vendor: PurchaseOrderVendor | null
  date: string
  due_date: string | null
  status: VendorBillStatus
  items: Record<string, any>[]
  total_amount: number
  created_at: string
  updated_at: string
}

export type ExpenseStatus = 'draft' | 'sent' | 'approved' | 'paid' | 'declined'

export interface Expense {
  uuid: string
  project: TimesheetProject
  user: TaskAssignmentUser | null
  description: string
  amount: number
  date: string
  billable: boolean
  status: ExpenseStatus
  receipt_url: string | null
  created_at: string
  updated_at: string
}

export interface ProjectsListResponse {
  projects: Project[]
  pagination: Pagination
}

export interface TasksListResponse {
  tasks: Task[]
  pagination: Pagination
}

export interface TimesheetsListResponse {
  timesheets: TimesheetEntry[]
  pagination: Pagination
}

export interface SalesOrdersListResponse {
  sales_orders: SalesOrder[]
  pagination: Pagination
}

export interface PurchaseOrdersListResponse {
  purchase_orders: PurchaseOrder[]
  pagination: Pagination
}

export interface InvoicesListResponse {
  invoices: Invoice[]
  pagination: Pagination
}

export interface VendorBillsListResponse {
  vendor_bills: VendorBill[]
  pagination: Pagination
}

export interface ExpensesListResponse {
  expenses: Expense[]
  pagination: Pagination
}

export type ContactType = 'client' | 'vendor' | 'both'

export interface Contact {
  uuid: string
  name: string
  type: ContactType
  email: string | null
  phone: string | null
  address: string | null
  created_at: string
  updated_at: string
}

export interface ContactsListResponse {
  contacts: Contact[]
  pagination: Pagination
}

export interface UsersListResponse {
  users: AuthUser[]
  pagination: Pagination
}

export interface AnalyticsProjectTrend {
  month: string
  active: number
  completed: number
}

export interface AnalyticsRevenuePoint {
  month: string
  revenue: number
  cost: number
}

export interface AnalyticsResourcePoint {
  name: string
  value: number
  color: string
}

export interface AnalyticsKpi {
  activeProjects: number
  activeProjectsChange: number
  tasksCompleted: number
  tasksCompletedChange: number
  hoursLogged: number
  hoursLoggedChange: number
  revenue: number
  revenueChange: number
}

export interface AnalyticsDashboardResponse {
  projectTrends: AnalyticsProjectTrend[]
  revenueVsCost: AnalyticsRevenuePoint[]
  resourceUtilization: AnalyticsResourcePoint[]
  kpi: AnalyticsKpi
}

