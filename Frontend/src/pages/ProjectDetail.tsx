import { ChangeEvent, ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Calendar, Users, Flag, Wallet2, ClipboardList, FileText, Receipt, Clock, Plus } from 'lucide-react'
import { Card, CardBody, CardHeader, CardTitle } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { ProgressBar } from '../components/ui/ProgressBar'
import { Modal } from '../components/ui/Modal'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from '../hooks/useNavigate'
import {
  ApiError,
  createExpense,
  createInvoice,
  createPurchaseOrder,
  createSalesOrder,
  createTask,
  createTimesheet,
  createVendorBill,
  getProject,
  listContacts,
  listExpenses,
  listInvoices,
  listPurchaseOrders,
  listSalesOrders,
  listTasks,
  listTimesheets,
  listUsers,
  listVendorBills,
  updateExpense,
  updateInvoice,
  updatePurchaseOrder,
  updateSalesOrder,
  updateTask,
  updateVendorBill
} from '../lib/api'
import {
  Expense,
  Invoice,
  Project,
  PurchaseOrder,
  SalesOrder,
  Task,
  TaskPriority,
  TaskStatus,
  TimesheetEntry,
  VendorBill,
  AuthUser,
  Contact
} from '../lib/types'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { useToast } from '../hooks/useToast'
type ProjectDetailProps = {
  uuid?: string
}

type LoadingState = 'idle' | 'loading' | 'error'

type TaskFormState = {
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  due_date: string
  assignee_uuid: string
}

type TimesheetFormState = {
  task_uuid: string
  date: string
  hours: string
  description: string
  billable: boolean
}

type SalesOrderFormState = {
  client_uuid: string
  status: string
  date: string
  total_amount: string
  items: string
}

type PurchaseOrderFormState = {
  vendor_uuid: string
  status: string
  date: string
  total_amount: string
  items: string
}

type InvoiceFormState = {
  client_uuid: string
  sales_order_uuid: string
  status: string
  date: string
  due_date: string
  total_amount: string
  items: string
}

type VendorBillFormState = {
  vendor_uuid: string
  purchase_order_uuid: string
  status: string
  date: string
  due_date: string
  total_amount: string
  items: string
}

type ExpenseFormState = {
  user_uuid: string
  description: string
  amount: string
  date: string
  status: string
  billable: boolean
}

type FinanceModalState =
  | { type: 'salesOrder'; mode: 'create' | 'edit'; form: SalesOrderFormState; record?: SalesOrder }
  | { type: 'purchaseOrder'; mode: 'create' | 'edit'; form: PurchaseOrderFormState; record?: PurchaseOrder }
  | { type: 'invoice'; mode: 'create' | 'edit'; form: InvoiceFormState; record?: Invoice }
  | { type: 'vendorBill'; mode: 'create' | 'edit'; form: VendorBillFormState; record?: VendorBill }
  | { type: 'expense'; mode: 'create' | 'edit'; form: ExpenseFormState; record?: Expense }

const STATUS_BADGE: Record<Project['status'], 'info' | 'warning' | 'success' | 'default'> = {
  planned: 'warning',
  active: 'info',
  on_hold: 'default',
  completed: 'success'
}

const SALES_ORDER_STATUSES = ['draft', 'sent', 'approved', 'paid', 'declined'] as const
const PURCHASE_ORDER_STATUSES = ['draft', 'sent', 'approved', 'paid', 'declined'] as const
const INVOICE_STATUSES = ['draft', 'sent', 'approved', 'paid', 'declined'] as const
const VENDOR_BILL_STATUSES = ['draft', 'sent', 'approved', 'paid', 'declined'] as const
const EXPENSE_STATUSES = ['draft', 'sent', 'approved', 'paid', 'declined'] as const

const toSentence = (value: string) =>
  value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

const parseItemsField = (raw: string) => {
  if (!raw || !raw.trim()) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed
    }
  } catch (error) {
    // fall through
  }
  throw new Error('INVALID_ITEMS')
}

const formatCurrency = (value: number | null | undefined) => {
  const amount = Number(value ?? 0)
  if (!amount) return '₹0'
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`
  return `₹${amount.toLocaleString('en-IN')}`
}

const formatDate = (value: string | null | undefined) => {
  if (!value) return 'Not set'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString()
}

export function ProjectDetail({ uuid }: ProjectDetailProps) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [timesheets, setTimesheets] = useState<TimesheetEntry[]>([])
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([])
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [vendorBills, setVendorBills] = useState<VendorBill[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loadingState, setLoadingState] = useState<LoadingState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [assignableUsers, setAssignableUsers] = useState<AuthUser[]>([])
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [taskModalLoading, setTaskModalLoading] = useState(false)
  const [taskSubmitting, setTaskSubmitting] = useState(false)
  const [taskForm, setTaskForm] = useState<TaskFormState>({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    due_date: '',
    assignee_uuid: ''
  })
  const [isTimesheetModalOpen, setTimesheetModalOpen] = useState(false)
  const [timesheetSubmitting, setTimesheetSubmitting] = useState(false)
  const [timesheetForm, setTimesheetForm] = useState<TimesheetFormState>({
    task_uuid: '',
    date: new Date().toISOString().split('T')[0],
    hours: '',
    description: '',
    billable: true
  })
  const [editingTaskUuid, setEditingTaskUuid] = useState<string | null>(null)
  const [clientContacts, setClientContacts] = useState<Contact[]>([])
  const [vendorContacts, setVendorContacts] = useState<Contact[]>([])
  const [financeModal, setFinanceModal] = useState<FinanceModalState | null>(null)
  const [financeModalLoading, setFinanceModalLoading] = useState(false)
  const [financeSubmitting, setFinanceSubmitting] = useState(false)

  const handleTaskFormChange = (updates: Partial<TaskFormState>) => {
    setTaskForm((prev) => ({ ...prev, ...updates }))
  }

  const resetTaskForm = () => {
    setTaskForm({
      title: '',
      description: '',
      status: 'todo',
      priority: 'medium',
      due_date: '',
      assignee_uuid: user?.uuid ?? ''
    })
  }

  const loadAssignableUsers = useCallback(async () => {
    if (assignableUsers.length > 0) {
      return assignableUsers
    }

    let fetchedUsers: AuthUser[] = []
    try {
      const usersResponse = await listUsers({ limit: 100 })
      fetchedUsers = usersResponse.users || []
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        fetchedUsers = user ? [user] : []
      } else {
        console.error('Failed to load assignable users', error)
        showToast({
          title: 'Unable to load team members',
          description: error instanceof Error ? error.message : undefined,
          variant: 'error'
        })
        fetchedUsers = user ? [user] : []
      }
    }

    if (fetchedUsers.length === 0 && user) {
      fetchedUsers = [user]
    }

    setAssignableUsers(fetchedUsers)
    return fetchedUsers
  }, [assignableUsers, showToast, user])

  const loadContacts = useCallback(async () => {
    if (clientContacts.length > 0 || vendorContacts.length > 0) {
      return { clients: clientContacts, vendors: vendorContacts }
    }

    try {
      const response = await listContacts({ limit: 200 })
      const contacts = response.contacts || []
      const clients = contacts.filter((contact) => contact.type === 'client' || contact.type === 'both')
      const vendors = contacts.filter((contact) => contact.type === 'vendor' || contact.type === 'both')
      setClientContacts(clients)
      setVendorContacts(vendors)
      return { clients, vendors }
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 403)) {
        console.error('Failed to load contacts', error)
        showToast({
          title: 'Unable to load contacts',
          description: error instanceof Error ? error.message : undefined,
          variant: 'error'
        })
      }
      return { clients: clientContacts, vendors: vendorContacts }
    }
  }, [clientContacts, vendorContacts, showToast])

  const openTaskModal = async (task?: Task) => {
    setIsTaskModalOpen(true)
    setTaskModalLoading(true)
    try {
      const fetchedUsers = await loadAssignableUsers()
      const defaultAssignee = task?.assignee?.uuid ?? fetchedUsers[0]?.uuid ?? user?.uuid ?? ''
      setEditingTaskUuid(task?.uuid ?? null)
      setTaskForm({
        title: task?.title ?? '',
        description: task?.description ?? '',
        status: task?.status ?? 'todo',
        priority: task?.priority ?? 'medium',
        due_date: task?.due_date ?? '',
        assignee_uuid: defaultAssignee
      })
    } catch (error) {
      console.error('Failed to initialise task modal', error)
      showToast({
        title: 'Unable to open task',
        description: error instanceof Error ? error.message : undefined,
        variant: 'error'
      })
      setIsTaskModalOpen(false)
    } finally {
      setTaskModalLoading(false)
    }
  }

  const closeTaskModal = () => {
    setIsTaskModalOpen(false)
    setEditingTaskUuid(null)
    resetTaskForm()
  }

  const handleSubmitTask = async () => {
    if (!project) return
    if (!taskForm.title.trim()) {
      showToast({
        title: 'Task title required',
        description: 'Please provide a title for the task.',
        variant: 'error'
      })
      return
    }

    setTaskSubmitting(true)
    try {
      const basePayload = {
        title: taskForm.title.trim(),
        description: taskForm.description.trim() ? taskForm.description.trim() : undefined,
        status: taskForm.status,
        priority: taskForm.priority,
        assignee_uuid: taskForm.assignee_uuid || null,
        due_date: taskForm.due_date || null,
        assigned_user_uuids: taskForm.assignee_uuid ? [taskForm.assignee_uuid] : undefined
      }

      if (editingTaskUuid) {
        const updatedTask = await updateTask(editingTaskUuid, basePayload)
        setTasks((prev) => prev.map((task) => (task.uuid === updatedTask.uuid ? updatedTask : task)))
        showToast({
          title: 'Task updated',
          description: updatedTask.title,
          variant: 'success'
        })
      } else {
        const newTask = await createTask({
          project_uuid: project.uuid,
          ...basePayload
        })
        setTasks((prev) => [newTask, ...prev])
        showToast({
          title: 'Task created',
          description: newTask.title,
          variant: 'success'
        })
      }

      closeTaskModal()
    } catch (error) {
      console.error('Failed to save task', error)
      showToast({
        title: 'Failed to save task',
        description: error instanceof Error ? error.message : undefined,
        variant: 'error'
      })
    } finally {
      setTaskSubmitting(false)
    }
  }

  const handleFinanceFieldChange = (field: string, value: string | boolean) => {
    setFinanceModal((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        form: {
          ...(prev.form as Record<string, any>),
          [field]: value
        }
      } as FinanceModalState
    })
  }

  const closeFinanceModal = () => {
    setFinanceModal(null)
  }

  const openFinanceModal = async (type: FinanceModalState['type'], mode: 'create' | 'edit', record?: SalesOrder | PurchaseOrder | Invoice | VendorBill | Expense) => {
    if (!project) return
    setFinanceModalLoading(true)
    try {
      const { clients, vendors } = await loadContacts()
      let usersList = assignableUsers
      if (type === 'expense') {
        usersList = await loadAssignableUsers()
      }

      const today = new Date().toISOString().split('T')[0]

      switch (type) {
        case 'salesOrder': {
          const form: SalesOrderFormState = {
            client_uuid: mode === 'edit' && record && 'client' in record ? record.client?.uuid ?? '' : clients[0]?.uuid ?? '',
            status: mode === 'edit' && record && 'status' in record ? record.status : SALES_ORDER_STATUSES[0],
            date: mode === 'edit' && record && 'date' in record ? record.date ?? today : today,
            total_amount: mode === 'edit' && record && 'total_amount' in record ? String(record.total_amount ?? '') : '',
            items:
              mode === 'edit' && record && 'items' in record && record.items && record.items.length > 0
                ? JSON.stringify(record.items, null, 2)
                : ''
          }
          setFinanceModal({ type, mode, form, record: record as SalesOrder })
          break
        }
        case 'purchaseOrder': {
          const form: PurchaseOrderFormState = {
            vendor_uuid: mode === 'edit' && record && 'vendor' in record ? record.vendor?.uuid ?? '' : vendors[0]?.uuid ?? '',
            status: mode === 'edit' && record && 'status' in record ? record.status : PURCHASE_ORDER_STATUSES[0],
            date: mode === 'edit' && record && 'date' in record ? record.date ?? today : today,
            total_amount: mode === 'edit' && record && 'total_amount' in record ? String(record.total_amount ?? '') : '',
            items:
              mode === 'edit' && record && 'items' in record && record.items && record.items.length > 0
                ? JSON.stringify(record.items, null, 2)
                : ''
          }
          setFinanceModal({ type, mode, form, record: record as PurchaseOrder })
          break
        }
        case 'invoice': {
          const form: InvoiceFormState = {
            client_uuid: mode === 'edit' && record && 'client' in record ? record.client?.uuid ?? '' : clients[0]?.uuid ?? '',
            sales_order_uuid: mode === 'edit' && record && 'sales_order' in record ? record.sales_order?.uuid ?? '' : '',
            status: mode === 'edit' && record && 'status' in record ? record.status : INVOICE_STATUSES[0],
            date: mode === 'edit' && record && 'date' in record ? record.date ?? today : today,
            due_date: mode === 'edit' && record && 'due_date' in record ? record.due_date ?? '' : '',
            total_amount: mode === 'edit' && record && 'total_amount' in record ? String(record.total_amount ?? '') : '',
            items:
              mode === 'edit' && record && 'items' in record && record.items && record.items.length > 0
                ? JSON.stringify(record.items, null, 2)
                : ''
          }
          setFinanceModal({ type, mode, form, record: record as Invoice })
          break
        }
        case 'vendorBill': {
          const form: VendorBillFormState = {
            vendor_uuid: mode === 'edit' && record && 'vendor' in record ? record.vendor?.uuid ?? '' : vendors[0]?.uuid ?? '',
            purchase_order_uuid: mode === 'edit' && record && 'purchase_order' in record ? record.purchase_order?.uuid ?? '' : '',
            status: mode === 'edit' && record && 'status' in record ? record.status : VENDOR_BILL_STATUSES[0],
            date: mode === 'edit' && record && 'date' in record ? record.date ?? today : today,
            due_date: mode === 'edit' && record && 'due_date' in record ? record.due_date ?? '' : '',
            total_amount: mode === 'edit' && record && 'total_amount' in record ? String(record.total_amount ?? '') : '',
            items:
              mode === 'edit' && record && 'items' in record && record.items && record.items.length > 0
                ? JSON.stringify(record.items, null, 2)
                : ''
          }
          setFinanceModal({ type, mode, form, record: record as VendorBill })
          break
        }
        case 'expense': {
          const defaultUser =
            mode === 'edit' && record && 'user' in record ? record.user?.uuid ?? '' : usersList[0]?.uuid ?? user?.uuid ?? ''
          const form: ExpenseFormState = {
            user_uuid: defaultUser,
            description: mode === 'edit' && record && 'description' in record ? record.description ?? '' : '',
            amount: mode === 'edit' && record && 'amount' in record ? String(record.amount ?? '') : '',
            date: mode === 'edit' && record && 'date' in record ? record.date ?? today : today,
            status: mode === 'edit' && record && 'status' in record ? record.status : EXPENSE_STATUSES[0],
            billable: mode === 'edit' && record && 'billable' in record ? Boolean(record.billable) : true
          }
          setFinanceModal({ type, mode, form, record: record as Expense })
          break
        }
      }
    } catch (error) {
      console.error('Failed to open finance modal', error)
      showToast({
        title: 'Unable to open record',
        description: error instanceof Error ? error.message : undefined,
        variant: 'error'
      })
    } finally {
      setFinanceModalLoading(false)
    }
  }

  const handleFinanceSubmit = async () => {
    if (!financeModal || !project) return
    setFinanceSubmitting(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      switch (financeModal.type) {
        case 'salesOrder': {
          const { form, mode, record } = financeModal
          if (!form.client_uuid) {
            showToast({ title: 'Client required', description: 'Select a client before saving.', variant: 'error' })
            break
          }
          const totalAmount = Number(form.total_amount || 0)
          if (Number.isNaN(totalAmount) || totalAmount < 0) {
            showToast({ title: 'Invalid amount', description: 'Enter a valid total amount.', variant: 'error' })
            break
          }
          let items: any[]
          try {
            items = parseItemsField(form.items)
          } catch {
            showToast({ title: 'Invalid items', description: 'Items must be a valid JSON array.', variant: 'error' })
            break
          }

          if (mode === 'edit' && record) {
            await updateSalesOrder(record.uuid, {
              client_uuid: form.client_uuid || null,
              status: form.status,
              date: form.date || today,
              total_amount: totalAmount,
              items
            })
            showToast({ title: 'Sales order updated', variant: 'success' })
          } else {
            await createSalesOrder({
              project_uuid: project.uuid,
              client_uuid: form.client_uuid || null,
              status: form.status,
              date: form.date || today,
              total_amount: totalAmount,
              items
            })
            showToast({ title: 'Sales order created', variant: 'success' })
          }
          await loadProjectData()
          closeFinanceModal()
          break
        }
        case 'purchaseOrder': {
          const { form, mode, record } = financeModal
          if (!form.vendor_uuid) {
            showToast({ title: 'Vendor required', description: 'Select a vendor before saving.', variant: 'error' })
            break
          }
          const totalAmount = Number(form.total_amount || 0)
          if (Number.isNaN(totalAmount) || totalAmount < 0) {
            showToast({ title: 'Invalid amount', description: 'Enter a valid total amount.', variant: 'error' })
            break
          }
          let items: any[]
          try {
            items = parseItemsField(form.items)
          } catch {
            showToast({ title: 'Invalid items', description: 'Items must be a valid JSON array.', variant: 'error' })
            break
          }
          if (mode === 'edit' && record) {
            await updatePurchaseOrder(record.uuid, {
              vendor_uuid: form.vendor_uuid || null,
              status: form.status,
              date: form.date || today,
              total_amount: totalAmount,
              items
            })
            showToast({ title: 'Purchase order updated', variant: 'success' })
          } else {
            await createPurchaseOrder({
              project_uuid: project.uuid,
              vendor_uuid: form.vendor_uuid || null,
              status: form.status,
              date: form.date || today,
              total_amount: totalAmount,
              items
            })
            showToast({ title: 'Purchase order created', variant: 'success' })
          }
          await loadProjectData()
          closeFinanceModal()
          break
        }
        case 'invoice': {
          const { form, mode, record } = financeModal
          if (!form.client_uuid) {
            showToast({ title: 'Client required', description: 'Select a client before saving.', variant: 'error' })
            break
          }
          const totalAmount = Number(form.total_amount || 0)
          if (Number.isNaN(totalAmount) || totalAmount < 0) {
            showToast({ title: 'Invalid amount', description: 'Enter a valid total amount.', variant: 'error' })
            break
          }
          let items: any[]
          try {
            items = parseItemsField(form.items)
          } catch {
            showToast({ title: 'Invalid items', description: 'Items must be a valid JSON array.', variant: 'error' })
            break
          }
          if (mode === 'edit' && record) {
            await updateInvoice(record.uuid, {
              client_uuid: form.client_uuid || null,
              sales_order_uuid: form.sales_order_uuid || null,
              status: form.status,
              date: form.date || today,
              due_date: form.due_date || null,
              total_amount: totalAmount,
              items
            })
            showToast({ title: 'Invoice updated', variant: 'success' })
          } else {
            await createInvoice({
              project_uuid: project.uuid,
              client_uuid: form.client_uuid || null,
              sales_order_uuid: form.sales_order_uuid || null,
              status: form.status,
              date: form.date || today,
              due_date: form.due_date || null,
              total_amount: totalAmount,
              items
            })
            showToast({ title: 'Invoice created', variant: 'success' })
          }
          await loadProjectData()
          closeFinanceModal()
          break
        }
        case 'vendorBill': {
          const { form, mode, record } = financeModal
          if (!form.vendor_uuid) {
            showToast({ title: 'Vendor required', description: 'Select a vendor before saving.', variant: 'error' })
            break
          }
          const totalAmount = Number(form.total_amount || 0)
          if (Number.isNaN(totalAmount) || totalAmount < 0) {
            showToast({ title: 'Invalid amount', description: 'Enter a valid total amount.', variant: 'error' })
            break
          }
          let items: any[]
          try {
            items = parseItemsField(form.items)
          } catch {
            showToast({ title: 'Invalid items', description: 'Items must be a valid JSON array.', variant: 'error' })
            break
          }
          if (mode === 'edit' && record) {
            await updateVendorBill(record.uuid, {
              vendor_uuid: form.vendor_uuid || null,
              purchase_order_uuid: form.purchase_order_uuid || null,
              status: form.status,
              date: form.date || today,
              due_date: form.due_date || null,
              total_amount: totalAmount,
              items
            })
            showToast({ title: 'Vendor bill updated', variant: 'success' })
          } else {
            await createVendorBill({
              project_uuid: project.uuid,
              vendor_uuid: form.vendor_uuid || null,
              purchase_order_uuid: form.purchase_order_uuid || null,
              status: form.status,
              date: form.date || today,
              due_date: form.due_date || null,
              total_amount: totalAmount,
              items
            })
            showToast({ title: 'Vendor bill created', variant: 'success' })
          }
          await loadProjectData()
          closeFinanceModal()
          break
        }
        case 'expense': {
          const { form, mode, record } = financeModal
          if (!form.description.trim()) {
            showToast({ title: 'Description required', variant: 'error' })
            break
          }
          const amount = Number(form.amount || 0)
          if (Number.isNaN(amount) || amount <= 0) {
            showToast({ title: 'Invalid amount', description: 'Enter a positive amount.', variant: 'error' })
            break
          }
          if (mode === 'edit' && record) {
            await updateExpense(record.uuid, {
              user_uuid: form.user_uuid || null,
              description: form.description.trim(),
              amount,
              date: form.date || today,
              status: form.status,
              billable: form.billable
            })
            showToast({ title: 'Expense updated', variant: 'success' })
          } else {
            await createExpense({
              project_uuid: project.uuid,
              user_uuid: form.user_uuid || user?.uuid || '',
              description: form.description.trim(),
              amount,
              date: form.date || today,
              status: form.status,
              billable: form.billable
            })
            showToast({ title: 'Expense created', variant: 'success' })
          }
          await loadProjectData()
          closeFinanceModal()
          break
        }
      }
    } catch (error) {
      console.error('Failed to save record', error)
      showToast({
        title: 'Unable to save record',
        description: error instanceof Error ? error.message : undefined,
        variant: 'error'
      })
    } finally {
      setFinanceSubmitting(false)
    }
  }

  const handleTimesheetChange = (updates: Partial<TimesheetFormState>) => {
    setTimesheetForm((prev) => ({ ...prev, ...updates }))
  }

  const openTimesheetModal = () => {
    setTimesheetForm({
      task_uuid: tasks[0]?.uuid ?? '',
      date: new Date().toISOString().split('T')[0],
      hours: '',
      description: '',
      billable: true
    })
    setTimesheetModalOpen(true)
  }

  const closeTimesheetModal = () => {
    setTimesheetModalOpen(false)
  }

  const handleSubmitTimesheet = async () => {
    if (!project || !user) {
      showToast({
        title: 'Unable to log time',
        description: 'Project or user context is missing. Please refresh and try again.',
        variant: 'error'
      })
      return
    }

    if (!timesheetForm.date) {
      showToast({
        title: 'Date required',
        description: 'Please select a date for this entry.',
        variant: 'error'
      })
      return
    }

    const hours = Number(timesheetForm.hours)
    if (Number.isNaN(hours) || hours <= 0) {
      showToast({
        title: 'Invalid hours',
        description: 'Enter a positive number of hours.',
        variant: 'error'
      })
      return
    }

    setTimesheetSubmitting(true)
    try {
      const payload = {
        project_uuid: project.uuid,
        task_uuid: timesheetForm.task_uuid ? timesheetForm.task_uuid : undefined,
        user_uuid: user.uuid,
        date: timesheetForm.date,
        hours,
        description: timesheetForm.description.trim() ? timesheetForm.description.trim() : undefined,
        billable: timesheetForm.billable
      }

      const entry = await createTimesheet(payload)
      setTimesheets((prev) => [entry, ...prev])
      showToast({
        title: 'Time logged',
        description: `${hours.toFixed(1)} hours recorded for ${entry.project.name}.`,
        variant: 'success'
      })
      setTimesheetModalOpen(false)
    } catch (error) {
      console.error('Failed to log time', error)
      showToast({
        title: 'Failed to log time',
        description: error instanceof Error ? error.message : undefined,
        variant: 'error'
      })
    } finally {
      setTimesheetSubmitting(false)
    }
  }

  const loadProjectData = useCallback(async () => {
    if (!uuid) {
      setError('Project not found.')
      setLoadingState('error')
      return
    }
    setLoadingState('loading')
    setError(null)

    try {
      const projectRes = await getProject(uuid)
      setProject(projectRes)

      const [
        tasksResult,
        timesheetsResult,
        salesResult,
        purchaseResult,
        invoicesResult,
        vendorResult,
        expensesResult
      ] = await Promise.allSettled([
        listTasks({ project_uuid: uuid, limit: 100 }),
        listTimesheets({ project_uuid: uuid, limit: 100 }),
        listSalesOrders({ project_uuid: uuid, limit: 50 }),
        listPurchaseOrders({ project_uuid: uuid, limit: 50 }),
        listInvoices({ project_uuid: uuid, limit: 50 }),
        listVendorBills({ project_uuid: uuid, limit: 50 }),
        listExpenses({ project_uuid: uuid, limit: 50 })
      ])

      if (tasksResult.status === 'fulfilled') {
        setTasks(tasksResult.value.tasks || [])
      } else {
        console.warn('Failed to load tasks', tasksResult.reason)
      }

      if (timesheetsResult.status === 'fulfilled') {
        setTimesheets(timesheetsResult.value.timesheets || [])
      } else {
        console.warn('Failed to load timesheets', timesheetsResult.reason)
      }

      if (salesResult.status === 'fulfilled') {
        setSalesOrders(salesResult.value.sales_orders || [])
      } else {
        console.warn('Failed to load sales orders', salesResult.reason)
      }

      if (purchaseResult.status === 'fulfilled') {
        setPurchaseOrders(purchaseResult.value.purchase_orders || [])
      } else {
        console.warn('Failed to load purchase orders', purchaseResult.reason)
      }

      if (invoicesResult.status === 'fulfilled') {
        setInvoices(invoicesResult.value.invoices || [])
      } else {
        console.warn('Failed to load invoices', invoicesResult.reason)
      }

      if (vendorResult.status === 'fulfilled') {
        setVendorBills(vendorResult.value.vendor_bills || [])
      } else {
        console.warn('Failed to load vendor bills', vendorResult.reason)
      }

      if (expensesResult.status === 'fulfilled') {
        setExpenses(expensesResult.value.expenses || [])
      } else {
        console.warn('Failed to load expenses', expensesResult.reason)
      }
      setLoadingState('idle')
    } catch (err) {
      console.error('Failed to load project detail', err)
      setError('Unable to load project details. Please try again later.')
      setLoadingState('error')
    }
  }, [uuid])

  useEffect(() => {
    loadProjectData()
  }, [loadProjectData])

  const canManageTasks = user?.role === 'project_manager' || user?.role === 'admin'
  const canLogTime = user?.role === 'project_manager' || user?.role === 'team_member' || user?.role === 'admin'

  const costSummary = useMemo(() => {
    const timesheetCost = timesheets.reduce((sum, entry) => sum + Number(entry.cost_total ?? 0), 0)
    const expenseCost = expenses.reduce((sum, entry) => sum + Number(entry.amount ?? 0), 0)
    const vendorCost = vendorBills.reduce((sum, bill) => sum + Number(bill.total_amount ?? 0), 0)
    const totalCost = timesheetCost + expenseCost + vendorCost
    const invoiced = invoices.reduce((sum, invoice) => sum + Number(invoice.total_amount ?? 0), 0)
    const received = invoices.filter((invoice) => invoice.status === 'paid').reduce((sum, invoice) => sum + Number(invoice.total_amount ?? 0), 0)
    return {
      timesheetCost,
      expenseCost,
      vendorCost,
      totalCost,
      invoiced,
      received
    }
  }, [expenses, invoices, timesheets, vendorBills])

  const budgetProgress = useMemo(() => {
    if (!project || !project.budget) return 0
    if (!costSummary.totalCost) return 0
    return Math.min(100, (costSummary.totalCost / project.budget) * 100)
  }, [costSummary.totalCost, project])

  if (loadingState === 'loading') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 text-slate-300">
          <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span>Loading project details...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('projects')} icon={<ArrowLeft className="w-4 h-4" />}>
          Back to Projects
        </Button>
        <div className="p-4 rounded-lg border border-red-500/30 bg-red-500/10 text-red-200 text-sm">{error}</div>
      </div>
    )
  }

  if (!project) {
    return null
  }

  return (
    <>
      <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Button variant="ghost" onClick={() => navigate('projects')} icon={<ArrowLeft className="w-4 h-4" />}>
            Back to Projects
          </Button>
          <h1 className="text-3xl font-bold text-white">{project.name}</h1>
          <p className="text-slate-400 max-w-3xl">{project.description ?? 'No description provided.'}</p>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={STATUS_BADGE[project.status]} size="sm">
              {project.status.replace('_', ' ')}
            </Badge>
            <span className="text-sm text-slate-400 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {formatDate(project.start_date)} — {formatDate(project.end_date)}
            </span>
            {project.manager?.name && (
              <span className="text-sm text-slate-400 flex items-center gap-2">
                <Users className="w-4 h-4" />
                {project.manager.name}
              </span>
            )}
          </div>
        </div>
        {(canManageTasks || canLogTime) && (
          <div className="flex gap-2">
            {canManageTasks && (
              <Button variant="primary" onClick={openTaskModal}>
                Add Task
              </Button>
            )}
            {canLogTime && (
              <Button variant="secondary" onClick={openTimesheetModal}>
                Log Time
              </Button>
            )}
          </div>
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <CardTitle>Project Overview</CardTitle>
          <div className="flex items-center gap-3 text-sm text-slate-300">
            <span className="flex items-center gap-2">
              <Flag className="w-4 h-4 text-cyan-400" />
              {project.client?.name ?? 'Client not set'}
            </span>
            <span className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              {tasks.length} Tasks
            </span>
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              {timesheets.reduce((sum, t) => sum + Number(t.hours ?? 0), 0).toFixed(1)} Hours Logged
            </span>
          </div>
        </CardHeader>
        <CardBody className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2 text-sm text-slate-300">
              <span>Budget Utilization</span>
              <span>{project.budget ? `${budgetProgress.toFixed(1)}%` : '—'}</span>
            </div>
            <ProgressBar value={budgetProgress} max={100} showLabel={false} />
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
              <span>Budget: {formatCurrency(project.budget)}</span>
              <span>Costs: {formatCurrency(costSummary.totalCost)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SummaryCard
              icon={<Wallet2 className="w-5 h-5 text-cyan-400" />}
              title="Timesheet Cost"
              value={formatCurrency(costSummary.timesheetCost)}
            />
            <SummaryCard
              icon={<ClipboardList className="w-5 h-5 text-amber-400" />}
              title="Expenses"
              value={formatCurrency(costSummary.expenseCost)}
            />
            <SummaryCard
              icon={<FileText className="w-5 h-5 text-emerald-400" />}
              title="Vendor Bills"
              value={formatCurrency(costSummary.vendorCost)}
            />
            <SummaryCard
              icon={<Receipt className="w-5 h-5 text-blue-400" />}
              title="Invoiced Amount"
              value={formatCurrency(costSummary.invoiced)}
            />
            <SummaryCard
              icon={<Receipt className="w-5 h-5 text-green-400" />}
              title="Payments Received"
              value={formatCurrency(costSummary.received)}
            />
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Tasks</CardTitle>
            <Badge variant="info" size="sm">
              {tasks.length} open
            </Badge>
          </CardHeader>
          <CardBody className="space-y-3">
            {tasks.length === 0 ? (
              <div className="text-sm text-slate-400 text-center py-6">No tasks assigned yet.</div>
            ) : (
              tasks.slice(0, 6).map((task) => (
                <motion.div
                  key={task.uuid}
                  whileHover={{ scale: 1.01 }}
                  className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/60 cursor-pointer"
                  onClick={() => openTaskModal(task)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-100">{task.title}</p>
                      {task.description && <p className="text-xs text-slate-400 line-clamp-2">{task.description}</p>}
                      <div className="flex gap-2">
                        <Badge variant="default" size="sm">
                          {task.priority}
                        </Badge>
                        <Badge variant="info" size="sm">
                          {task.status.replace('_', ' ')}
                        </Badge>
                        {task.assignee?.name && <Badge size="sm">{task.assignee.name}</Badge>}
                      </div>
                    </div>
                    {task.due_date && (
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(task.due_date)}
                      </span>
                    )}
                  </div>
                </motion.div>
              ))
            )}
            {tasks.length > 6 && (
              <Button variant="ghost" size="sm" className="w-full" onClick={() => navigate('tasks')}>
                View all tasks
              </Button>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Recent Timesheets</CardTitle>
            <Badge variant="info" size="sm">
              {timesheets.length} entries
            </Badge>
          </CardHeader>
          <CardBody className="space-y-3">
            {timesheets.length === 0 ? (
              <div className="text-sm text-slate-400 text-center py-6">No time logged yet.</div>
            ) : (
              <div className="space-y-3">
                {timesheets.slice(0, 6).map((entry) => (
                  <div
                    key={entry.uuid}
                    className="flex items-start justify-between p-3 rounded-lg bg-slate-800/40 border border-slate-700/60"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-100">
                        {entry.task?.title ?? 'General Log'}
                      </p>
                      <p className="text-xs text-slate-400">{entry.user.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-100">{Number(entry.hours).toFixed(1)}h</p>
                      <p className="text-xs text-slate-500">{formatDate(entry.date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Financial Documents</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FinanceBucket
              title="Sales Orders"
              items={salesOrders}
              formatter={(item) => item.client?.name ?? '—'}
              getStatus={(item) => item.status}
              onItemClick={(order) => openFinanceModal('salesOrder', 'edit', order)}
              onAdd={() => openFinanceModal('salesOrder', 'create')}
              addLabel="New"
            />
            <FinanceBucket
              title="Purchase Orders"
              items={purchaseOrders}
              formatter={(item) => item.vendor?.name ?? '—'}
              getStatus={(item) => item.status}
              onItemClick={(purchase) => openFinanceModal('purchaseOrder', 'edit', purchase)}
              onAdd={() => openFinanceModal('purchaseOrder', 'create')}
              addLabel="New"
            />
            <FinanceBucket
              title="Vendor Bills"
              items={vendorBills}
              formatter={(item) => item.vendor?.name ?? '—'}
              getStatus={(item) => item.status}
              onItemClick={(bill) => openFinanceModal('vendorBill', 'edit', bill)}
              onAdd={() => openFinanceModal('vendorBill', 'create')}
              addLabel="New"
            />
            <FinanceBucket
              title="Invoices"
              items={invoices}
              formatter={(item) => item.client?.name ?? '—'}
              getStatus={(item) => item.status}
              onItemClick={(invoice) => openFinanceModal('invoice', 'edit', invoice)}
              onAdd={() => openFinanceModal('invoice', 'create')}
              addLabel="New"
            />
            <FinanceBucket
              title="Expenses"
              items={expenses}
              formatter={(item) => item.description}
              getStatus={(item) => item.status}
              onItemClick={(expense) => openFinanceModal('expense', 'edit', expense)}
              onAdd={() => openFinanceModal('expense', 'create')}
              addLabel="Log"
            />
          </div>
        </CardBody>
      </Card>
      </div>
      <TaskModal
        isOpen={isTaskModalOpen}
        loading={taskModalLoading}
        submitting={taskSubmitting}
        users={assignableUsers}
        values={taskForm}
        onClose={closeTaskModal}
        onChange={handleTaskFormChange}
        onSubmit={handleSubmitTask}
        mode={editingTaskUuid ? 'edit' : 'create'}
      />
      <TimesheetModal
        isOpen={isTimesheetModalOpen}
        submitting={timesheetSubmitting}
        tasks={tasks}
        values={timesheetForm}
        onClose={closeTimesheetModal}
        onChange={handleTimesheetChange}
        onSubmit={handleSubmitTimesheet}
      />
    <FinanceModal
      isOpen={Boolean(financeModal)}
      loading={financeModalLoading}
      submitting={financeSubmitting}
      modal={financeModal}
      onClose={closeFinanceModal}
      onChange={handleFinanceFieldChange}
      onSubmit={handleFinanceSubmit}
      clients={clientContacts}
      vendors={vendorContacts}
      salesOrders={salesOrders}
      purchaseOrders={purchaseOrders}
      users={assignableUsers}
    />
    </>
  )
}

type TaskModalProps = {
  isOpen: boolean
  loading: boolean
  submitting: boolean
  users: AuthUser[]
  values: TaskFormState
  onClose: () => void
  onChange: (updates: Partial<TaskFormState>) => void
  onSubmit: () => void
  mode: 'create' | 'edit'
}

function TaskModal({ isOpen, loading, submitting, users, values, onClose, onChange, onSubmit, mode }: TaskModalProps) {
  const isEdit = mode === 'edit'

  const handleFieldChange =
    (field: keyof TaskFormState) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      onChange({ [field]: event.target.value } as Partial<TaskFormState>)
    }

  const statusOptions: { value: TaskStatus; label: string }[] = [
    { value: 'todo', label: 'To do' },
    { value: 'in_progress', label: 'In progress' },
    { value: 'review', label: 'In review' },
    { value: 'done', label: 'Done' }
  ]

  const priorityOptions: { value: TaskPriority; label: string }[] = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' }
  ]

  const assigneeOptions = [
    { value: '', label: 'Unassigned' },
    ...users.map((member) => ({ value: member.uuid, label: member.name }))
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Task' : 'Create Task'} size="md">
      {loading ? (
        <div className="flex items-center gap-3 text-slate-300">
          <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span>Loading team members...</span>
        </div>
      ) : (
        <div className="space-y-4">
          <Input
            label="Title"
            placeholder="Task title"
            value={values.title}
            onChange={handleFieldChange('title')}
            required
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Status"
              value={values.status}
              onChange={handleFieldChange('status')}
              options={statusOptions}
            />
            <Select
              label="Priority"
              value={values.priority}
              onChange={handleFieldChange('priority')}
              options={priorityOptions}
            />
            <Select
              label="Assignee"
              value={values.assignee_uuid}
              onChange={handleFieldChange('assignee_uuid')}
              options={assigneeOptions}
            />
            <Input
              label="Due Date"
              type="date"
              value={values.due_date}
              onChange={handleFieldChange('due_date')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
            <textarea
              className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
              rows={3}
              placeholder="Task details"
              value={values.description}
              onChange={(event) => onChange({ description: event.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={onSubmit} disabled={submitting}>
              {submitting ? 'Saving...' : isEdit ? 'Save Task' : 'Create Task'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

type TimesheetModalProps = {
  isOpen: boolean
  submitting: boolean
  tasks: Task[]
  values: TimesheetFormState
  onClose: () => void
  onChange: (updates: Partial<TimesheetFormState>) => void
  onSubmit: () => void
}

function TimesheetModal({ isOpen, submitting, tasks, values, onClose, onChange, onSubmit }: TimesheetModalProps) {
  const handleFieldChange =
    (field: keyof TimesheetFormState) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      onChange({ [field]: event.target.value } as Partial<TimesheetFormState>)
    }

  const taskOptions = [
    { value: '', label: 'General / no task' },
    ...tasks.map((task) => ({ value: task.uuid, label: task.title }))
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Log Time" size="sm">
      <div className="space-y-4">
        <Select
          label="Task"
          value={values.task_uuid}
          onChange={handleFieldChange('task_uuid')}
          options={taskOptions}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Date"
            type="date"
            value={values.date}
            onChange={handleFieldChange('date')}
            required
          />
          <Input
            label="Hours"
            type="number"
            min="0.25"
            step="0.25"
            value={values.hours}
            onChange={handleFieldChange('hours')}
            placeholder="1.0"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
          <textarea
            className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
            rows={3}
            placeholder="Optional notes"
            value={values.description}
            onChange={(event) => onChange({ description: event.target.value })}
          />
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-cyan-500 focus:ring-cyan-500/50"
            checked={values.billable}
            onChange={(event) => onChange({ billable: event.target.checked })}
          />
          Billable entry
        </label>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={submitting}>
            {submitting ? 'Logging...' : 'Log Time'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

type FinanceModalProps = {
  isOpen: boolean
  loading: boolean
  submitting: boolean
  modal: FinanceModalState | null
  onClose: () => void
  onChange: (field: string, value: string | boolean) => void
  onSubmit: () => void
  clients: Contact[]
  vendors: Contact[]
  salesOrders: SalesOrder[]
  purchaseOrders: PurchaseOrder[]
  users: AuthUser[]
}

function FinanceModal({
  isOpen,
  loading,
  submitting,
  modal,
  onClose,
  onChange,
  onSubmit,
  clients,
  vendors,
  salesOrders,
  purchaseOrders,
  users
}: FinanceModalProps) {
  if (!modal) return null

  const isEdit = modal.mode === 'edit'

  const titleMap: Record<FinanceModalState['type'], { create: string; edit: string }> = {
    salesOrder: { create: 'Create Sales Order', edit: 'Edit Sales Order' },
    purchaseOrder: { create: 'Create Purchase Order', edit: 'Edit Purchase Order' },
    invoice: { create: 'Create Invoice', edit: 'Edit Invoice' },
    vendorBill: { create: 'Create Vendor Bill', edit: 'Edit Vendor Bill' },
    expense: { create: 'Log Expense', edit: 'Edit Expense' }
  }

  const statusOptions = (statuses: readonly string[]) =>
    statuses.map((status) => ({ value: status, label: toSentence(status) }))

  const clientOptions = [{ value: '', label: 'Select client' }, ...clients.map((contact) => ({ value: contact.uuid, label: contact.name }))]
  const vendorOptions = [{ value: '', label: 'Select vendor' }, ...vendors.map((contact) => ({ value: contact.uuid, label: contact.name }))]
  const salesOrderOptions = [
    { value: '', label: 'No linked sales order' },
    ...salesOrders.map((order) => ({ value: order.uuid, label: order.client?.name ?? order.uuid }))
  ]
  const purchaseOrderOptions = [
    { value: '', label: 'No linked purchase order' },
    ...purchaseOrders.map((order) => ({ value: order.uuid, label: order.vendor?.name ?? order.uuid }))
  ]
  const userOptions = [{ value: '', label: 'Unassigned' }, ...users.map((member) => ({ value: member.uuid, label: member.name }))]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={titleMap[modal.type][modal.mode]} size="xl">
      {loading ? (
        <div className="flex items-center gap-3 text-slate-300">
          <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span>Preparing form...</span>
        </div>
      ) : (
        <div className="space-y-5">
          {modal.type === 'salesOrder' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Client"
                  value={modal.form.client_uuid}
                  onChange={(event) => onChange('client_uuid', event.target.value)}
                  options={clientOptions}
                />
                <Select
                  label="Status"
                  value={modal.form.status}
                  onChange={(event) => onChange('status', event.target.value)}
                  options={statusOptions(SALES_ORDER_STATUSES)}
                />
                <Input
                  label="Date"
                  type="date"
                  value={modal.form.date}
                  onChange={(event) => onChange('date', event.target.value)}
                />
                <Input
                  label="Total Amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={modal.form.total_amount}
                  onChange={(event) => onChange('total_amount', event.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Line Items (JSON array)</label>
                <textarea
                  className="w-full min-h-[140px] px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                  value={modal.form.items}
                  onChange={(event) => onChange('items', event.target.value)}
                  placeholder='[{"name":"Discovery","amount":1200}]'
                />
                <p className="mt-1 text-xs text-slate-500">Provide a valid JSON array describing each line item.</p>
              </div>
            </>
          )}

          {modal.type === 'purchaseOrder' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Vendor"
                  value={modal.form.vendor_uuid}
                  onChange={(event) => onChange('vendor_uuid', event.target.value)}
                  options={vendorOptions}
                />
                <Select
                  label="Status"
                  value={modal.form.status}
                  onChange={(event) => onChange('status', event.target.value)}
                  options={statusOptions(PURCHASE_ORDER_STATUSES)}
                />
                <Input
                  label="Date"
                  type="date"
                  value={modal.form.date}
                  onChange={(event) => onChange('date', event.target.value)}
                />
                <Input
                  label="Total Amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={modal.form.total_amount}
                  onChange={(event) => onChange('total_amount', event.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Line Items (JSON array)</label>
                <textarea
                  className="w-full min-h-[140px] px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                  value={modal.form.items}
                  onChange={(event) => onChange('items', event.target.value)}
                  placeholder='[{"name":"License","amount":500}]'
                />
              </div>
            </>
          )}

          {modal.type === 'invoice' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Client"
                  value={modal.form.client_uuid}
                  onChange={(event) => onChange('client_uuid', event.target.value)}
                  options={clientOptions}
                />
                <Select
                  label="Linked Sales Order"
                  value={modal.form.sales_order_uuid}
                  onChange={(event) => onChange('sales_order_uuid', event.target.value)}
                  options={salesOrderOptions}
                />
                <Select
                  label="Status"
                  value={modal.form.status}
                  onChange={(event) => onChange('status', event.target.value)}
                  options={statusOptions(INVOICE_STATUSES)}
                />
                <Input
                  label="Invoice Date"
                  type="date"
                  value={modal.form.date}
                  onChange={(event) => onChange('date', event.target.value)}
                />
                <Input
                  label="Due Date"
                  type="date"
                  value={modal.form.due_date}
                  onChange={(event) => onChange('due_date', event.target.value)}
                />
                <Input
                  label="Total Amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={modal.form.total_amount}
                  onChange={(event) => onChange('total_amount', event.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Line Items (JSON array)</label>
                <textarea
                  className="w-full min-h-[140px] px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                  value={modal.form.items}
                  onChange={(event) => onChange('items', event.target.value)}
                  placeholder='[{"name":"Milestone #1","amount":2500}]'
                />
              </div>
            </>
          )}

          {modal.type === 'vendorBill' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Vendor"
                  value={modal.form.vendor_uuid}
                  onChange={(event) => onChange('vendor_uuid', event.target.value)}
                  options={vendorOptions}
                />
                <Select
                  label="Linked Purchase Order"
                  value={modal.form.purchase_order_uuid}
                  onChange={(event) => onChange('purchase_order_uuid', event.target.value)}
                  options={purchaseOrderOptions}
                />
                <Select
                  label="Status"
                  value={modal.form.status}
                  onChange={(event) => onChange('status', event.target.value)}
                  options={statusOptions(VENDOR_BILL_STATUSES)}
                />
                <Input
                  label="Bill Date"
                  type="date"
                  value={modal.form.date}
                  onChange={(event) => onChange('date', event.target.value)}
                />
                <Input
                  label="Due Date"
                  type="date"
                  value={modal.form.due_date}
                  onChange={(event) => onChange('due_date', event.target.value)}
                />
                <Input
                  label="Total Amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={modal.form.total_amount}
                  onChange={(event) => onChange('total_amount', event.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Line Items (JSON array)</label>
                <textarea
                  className="w-full min-h-[140px] px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                  value={modal.form.items}
                  onChange={(event) => onChange('items', event.target.value)}
                  placeholder='[{"name":"Hardware","amount":800}]'
                />
              </div>
            </>
          )}

          {modal.type === 'expense' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Recorded By"
                  value={modal.form.user_uuid}
                  onChange={(event) => onChange('user_uuid', event.target.value)}
                  options={userOptions}
                />
                <Select
                  label="Status"
                  value={modal.form.status}
                  onChange={(event) => onChange('status', event.target.value)}
                  options={statusOptions(EXPENSE_STATUSES)}
                />
                <Input
                  label="Date"
                  type="date"
                  value={modal.form.date}
                  onChange={(event) => onChange('date', event.target.value)}
                />
                <Input
                  label="Amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={modal.form.amount}
                  onChange={(event) => onChange('amount', event.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
                <textarea
                  className="w-full min-h-[120px] px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                  value={modal.form.description}
                  onChange={(event) => onChange('description', event.target.value)}
                  placeholder="Expense details"
                />
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-cyan-500 focus:ring-cyan-500/50"
                  checked={modal.form.billable}
                  onChange={(event) => onChange('billable', event.target.checked)}
                />
                Billable expense
              </label>
            </>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={onSubmit} disabled={submitting}>
              {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Save'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

function SummaryCard({ icon, title, value }: { icon: ReactNode; title: string; value: string }) {
  return (
    <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2">
      <div className="flex items-center gap-2 text-slate-300">
        {icon}
        <span className="text-sm">{title}</span>
      </div>
      <p className="text-lg font-semibold text-white">{value}</p>
    </div>
  )
}

function FinanceBucket<T extends { uuid: string; total_amount?: number | null; amount?: number | null; status?: string }>(
  {
    title,
    items,
    formatter,
    onItemClick,
    onAdd,
    addLabel,
    getStatus
  }: {
    title: string
    items: T[]
    formatter: (item: T) => string
    onItemClick?: (item: T) => void
    onAdd?: () => void
    addLabel?: string
    getStatus?: (item: T) => string | undefined
  }
) {
  return (
    <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
        <div className="flex items-center gap-2">
          <Badge size="sm" variant="default">
            {items.length}
          </Badge>
          {onAdd && (
            <Button size="sm" variant="ghost" onClick={onAdd} icon={<Plus className="w-4 h-4" />}>
              {addLabel ?? 'Add'}
            </Button>
          )}
        </div>
      </div>
      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="text-xs text-slate-500">No records</p>
        ) : (
          items.slice(0, 4).map((item) => (
            <button
              key={item.uuid}
              type="button"
              disabled={!onItemClick}
              onClick={onItemClick ? () => onItemClick(item) : undefined}
              className={`w-full rounded-lg border border-slate-700/60 px-3 py-2 text-left transition-colors ${
                onItemClick ? 'hover:border-cyan-500/40 cursor-pointer' : 'cursor-default'
              }`}
            >
              <div className="flex items-center justify-between text-xs md:text-sm text-slate-200 gap-3">
                <span className="truncate">{formatter(item)}</span>
                <span className="font-semibold">{formatCurrency((item as any).total_amount ?? (item as any).amount)}</span>
              </div>
              {(() => {
                const status = getStatus ? getStatus(item) : (item as any).status
                return status ? (
                  <div className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">
                    {toSentence(status)}
                  </div>
                ) : null
              })()}
            </button>
          ))
        )}
      </div>
    </div>
  )
}

