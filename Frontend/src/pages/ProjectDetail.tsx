import { ReactNode, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Calendar, Users, Flag, Wallet2, ClipboardList, FileText, Receipt, Clock } from 'lucide-react'
import { Card, CardBody, CardHeader, CardTitle } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { ProgressBar } from '../components/ui/ProgressBar'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from '../hooks/useNavigate'
import {
  getProject,
  listExpenses,
  listInvoices,
  listPurchaseOrders,
  listSalesOrders,
  listTasks,
  listTimesheets,
  listVendorBills
} from '../lib/api'
import {
  Expense,
  Invoice,
  Project,
  PurchaseOrder,
  SalesOrder,
  Task,
  TimesheetEntry,
  VendorBill
} from '../lib/types'

type ProjectDetailProps = {
  uuid?: string
}

type LoadingState = 'idle' | 'loading' | 'error'

const STATUS_BADGE: Record<Project['status'], 'info' | 'warning' | 'success' | 'default'> = {
  planned: 'warning',
  active: 'info',
  on_hold: 'default',
  completed: 'success'
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

  useEffect(() => {
    const load = async () => {
      if (!uuid) {
        setError('Project not found.')
        setLoadingState('error')
        return
      }
      setLoadingState('loading')
      setError(null)

      try {
        const [
          projectRes,
          tasksRes,
          timesheetsRes,
          salesRes,
          purchaseRes,
          invoicesRes,
          vendorRes,
          expensesRes
        ] = await Promise.all([
          getProject(uuid),
          listTasks({ project_uuid: uuid, limit: 100 }),
          listTimesheets({ project_uuid: uuid, limit: 100 }),
          listSalesOrders({ project_uuid: uuid, limit: 50 }),
          listPurchaseOrders({ project_uuid: uuid, limit: 50 }),
          listInvoices({ project_uuid: uuid, limit: 50 }),
          listVendorBills({ project_uuid: uuid, limit: 50 }),
          listExpenses({ project_uuid: uuid, limit: 50 })
        ])

        setProject(projectRes)
        setTasks(tasksRes.tasks || [])
        setTimesheets(timesheetsRes.timesheets || [])
        setSalesOrders(salesRes.sales_orders || [])
        setPurchaseOrders(purchaseRes.purchase_orders || [])
        setInvoices(invoicesRes.invoices || [])
        setVendorBills(vendorRes.vendor_bills || [])
        setExpenses(expensesRes.expenses || [])
        setLoadingState('idle')
      } catch (err) {
        console.error('Failed to load project detail', err)
        setError('Unable to load project details. Please try again later.')
        setLoadingState('error')
      }
    }

    load()
  }, [uuid])

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
        {user?.role === 'project_manager' && (
          <div className="flex gap-2">
            <Button variant="primary">Add Task</Button>
            <Button variant="secondary">Log Time</Button>
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
                  className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/60"
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
            <FinanceBucket title="Sales Orders" items={salesOrders} formatter={(item) => item.client?.name ?? '—'} />
            <FinanceBucket title="Purchase Orders" items={purchaseOrders} formatter={(item) => item.vendor?.name ?? '—'} />
            <FinanceBucket title="Vendor Bills" items={vendorBills} formatter={(item) => item.vendor?.name ?? '—'} />
            <FinanceBucket title="Invoices" items={invoices} formatter={(item) => item.client?.name ?? '—'} />
            <FinanceBucket title="Expenses" items={expenses} formatter={(item) => item.description} />
          </div>
        </CardBody>
      </Card>
    </div>
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
  { title, items, formatter }: { title: string; items: T[]; formatter: (item: T) => string }
) {
  return (
    <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
        <Badge size="sm" variant="default">
          {items.length}
        </Badge>
      </div>
      <div className="mt-3 space-y-2">
        {items.length === 0 ? (
          <p className="text-xs text-slate-500">No records</p>
        ) : (
          items.slice(0, 4).map((item) => (
            <div key={item.uuid} className="flex items-center justify-between text-xs text-slate-300">
              <span className="truncate pr-2">{formatter(item)}</span>
              <span className="font-medium">{formatCurrency((item as any).total_amount ?? (item as any).amount)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

