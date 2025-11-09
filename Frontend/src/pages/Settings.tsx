import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { FileText, ShoppingCart, Receipt, CreditCard, Wallet } from 'lucide-react';
import { Card, CardHeader, CardBody, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Select } from '../components/ui/Select';
import {
  ApiError,
  createExpense,
  createInvoice,
  createPurchaseOrder,
  createSalesOrder,
  createVendorBill,
  listContacts,
  listExpenses,
  listInvoices,
  listProjects,
  listPurchaseOrders,
  listSalesOrders,
  listUsers,
  listVendorBills,
} from '../lib/api';
import {
  AuthUser,
  Contact,
  Expense,
  Invoice,
  PurchaseOrder,
  Project,
  SalesOrder,
  VendorBill,
} from '../lib/types';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';

const ORDER_STATUSES = ['draft', 'sent', 'approved', 'paid', 'declined'] as const;
const EXPENSE_STATUSES = ['draft', 'sent', 'approved', 'paid', 'declined'] as const;

type CreateFinanceModalProps = {
  isOpen: boolean;
  activeTab: string;
  loading: boolean;
  submitting: boolean;
  values: Record<string, any>;
  projects: Project[];
  clients: Contact[];
  vendors: Contact[];
  users: AuthUser[];
  salesOrders: SalesOrder[];
  purchaseOrders: PurchaseOrder[];
  onClose: () => void;
  onFieldChange: (field: string) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onSubmit: () => void;
};

export function Settings() {
  const [activeTab, setActiveTab] = useState<string>('sales_orders');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [vendorBills, setVendorBills] = useState<VendorBill[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const { user } = useAuth();
  const { showToast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [projectsRef, setProjectsRef] = useState<Project[]>([]);
  const [clientsRef, setClientsRef] = useState<Contact[]>([]);
  const [vendorsRef, setVendorsRef] = useState<Contact[]>([]);
  const [usersRef, setUsersRef] = useState<AuthUser[]>([]);
  const [referencesLoaded, setReferencesLoaded] = useState(false);

  useEffect(() => {
    loadFinanceData();
  }, []);

  useEffect(() => {
    const loadReferences = async () => {
      try {
        const [projectRes, clientRes, vendorRes] = await Promise.all([
          listProjects({ limit: 100 }),
          listContacts({ limit: 100, type: 'client' }),
          listContacts({ limit: 100, type: 'vendor' }),
        ]);
        setProjectsRef(projectRes.projects ?? []);
        setClientsRef(clientRes.contacts ?? []);
        setVendorsRef(vendorRes.contacts ?? []);
      } catch (err) {
        console.error('Failed to load reference data', err);
        showToast({
          title: 'Failed to load reference data',
          description: err instanceof Error ? err.message : undefined,
          variant: 'error',
        });
      }

      try {
        const userRes = await listUsers({ limit: 100 });
        setUsersRef(userRes.users ?? []);
      } catch (err) {
        if (err instanceof ApiError && err.status === 403) {
          setUsersRef(user ? [user] : []);
        } else {
          console.error('Failed to load users', err);
          showToast({
            title: 'Failed to load users',
            description: err instanceof Error ? err.message : undefined,
            variant: 'error',
          });
          setUsersRef(user ? [user] : []);
        }
      } finally {
        setReferencesLoaded(true);
      }
    };

    loadReferences();
  }, [showToast, user]);

  async function loadFinanceData() {
    setLoading(true);
    setError(null);
    try {
      const [salesRes, purchaseRes, invoiceRes, vendorRes, expenseRes] = await Promise.all([
        listSalesOrders({ limit: 20 }),
        listPurchaseOrders({ limit: 20 }),
        listInvoices({ limit: 20 }),
        listVendorBills({ limit: 20 }),
        listExpenses({ limit: 20 }),
      ]);

      setSalesOrders(salesRes.sales_orders ?? []);
      setPurchaseOrders(purchaseRes.purchase_orders ?? []);
      setInvoices(invoiceRes.invoices ?? []);
      setVendorBills(vendorRes.vendor_bills ?? []);
      setExpenses(expenseRes.expenses ?? []);
    } catch (err) {
      console.error('Failed to load finance data', err);
      setError('Unable to load finance records. Please try again later.');
      showToast({
        title: 'Failed to load finance records',
        description: err instanceof Error ? err.message : undefined,
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  }

  const buildInitialFormValues = (tab: string): Record<string, any> => {
    const today = new Date().toISOString().slice(0, 10);
    switch (tab) {
      case 'sales_orders':
        return {
          project_uuid: projectsRef[0]?.uuid ?? '',
          client_uuid: clientsRef[0]?.uuid ?? '',
          date: today,
          status: ORDER_STATUSES[0],
          item_description: '',
          quantity: '1',
          unit_price: '',
        };
      case 'purchase_orders':
        return {
          project_uuid: projectsRef[0]?.uuid ?? '',
          vendor_uuid: vendorsRef[0]?.uuid ?? '',
          date: today,
          status: ORDER_STATUSES[0],
          item_description: '',
          quantity: '1',
          unit_price: '',
        };
      case 'invoices':
        return {
          project_uuid: projectsRef[0]?.uuid ?? '',
          sales_order_uuid: salesOrders[0]?.uuid ?? '',
          client_uuid: clientsRef[0]?.uuid ?? '',
          date: today,
          due_date: today,
          status: ORDER_STATUSES[0],
          amount: '',
          item_description: '',
        };
      case 'bills':
        return {
          project_uuid: projectsRef[0]?.uuid ?? '',
          purchase_order_uuid: purchaseOrders[0]?.uuid ?? '',
          vendor_uuid: vendorsRef[0]?.uuid ?? '',
          date: today,
          due_date: today,
          status: ORDER_STATUSES[0],
          amount: '',
          item_description: '',
        };
      case 'expenses':
        return {
          project_uuid: projectsRef[0]?.uuid ?? '',
          user_uuid: user?.uuid ?? usersRef[0]?.uuid ?? '',
          description: '',
          amount: '',
          date: today,
          status: EXPENSE_STATUSES[0],
          billable: 'true',
        };
      default:
        return {};
    }
  };

  const openCreateModal = () => {
    setFormValues(buildInitialFormValues(activeTab));
    setIsCreateOpen(true);
  };

  const closeCreateModal = () => {
    setIsCreateOpen(false);
  };

  const handleFieldChange =
    (field: string) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setFormValues((prev) => ({
        ...prev,
        [field]: value,
      }));
    };

  const handleCreateRecord = async () => {
    setCreating(true);
    try {
      switch (activeTab) {
        case 'sales_orders': {
          if (!formValues.client_uuid) {
            throw new Error('Client is required for a sales order.');
          }
          const quantity = Number(formValues.quantity ?? 1);
          const unitPrice = Number(formValues.unit_price ?? 0);
          if (Number.isNaN(quantity) || quantity <= 0 || Number.isNaN(unitPrice) || unitPrice <= 0) {
            throw new Error('Quantity and unit price must be positive numbers.');
          }
          const totalAmount = quantity * unitPrice;
          await createSalesOrder({
            project_uuid: formValues.project_uuid || undefined,
            client_uuid: formValues.client_uuid,
            date: formValues.date,
            status: formValues.status,
            items: [
              {
                description: formValues.item_description || 'Line Item',
                quantity,
                unit_price: unitPrice,
                amount: totalAmount,
              },
            ],
            total_amount: totalAmount,
          });
          showToast({ title: 'Sales order created', variant: 'success' });
          break;
        }
        case 'purchase_orders': {
          if (!formValues.vendor_uuid) {
            throw new Error('Vendor is required for a purchase order.');
          }
          const quantity = Number(formValues.quantity ?? 1);
          const unitPrice = Number(formValues.unit_price ?? 0);
          if (Number.isNaN(quantity) || quantity <= 0 || Number.isNaN(unitPrice) || unitPrice <= 0) {
            throw new Error('Quantity and unit price must be positive numbers.');
          }
          const totalAmount = quantity * unitPrice;
          await createPurchaseOrder({
            project_uuid: formValues.project_uuid || undefined,
            vendor_uuid: formValues.vendor_uuid,
            date: formValues.date,
            status: formValues.status,
            items: [
              {
                description: formValues.item_description || 'Line Item',
                quantity,
                unit_price: unitPrice,
                amount: totalAmount,
              },
            ],
            total_amount: totalAmount,
          });
          showToast({ title: 'Purchase order created', variant: 'success' });
          break;
        }
        case 'invoices': {
          if (!formValues.client_uuid) {
            throw new Error('Client is required for an invoice.');
          }
          const amount = Number(formValues.amount ?? 0);
          if (Number.isNaN(amount) || amount <= 0) {
            throw new Error('Amount must be a positive number.');
          }
          await createInvoice({
            project_uuid: formValues.project_uuid || undefined,
            sales_order_uuid: formValues.sales_order_uuid || undefined,
            client_uuid: formValues.client_uuid,
            date: formValues.date,
            due_date: formValues.due_date || undefined,
            status: formValues.status,
            items: [
              {
                description: formValues.item_description || 'Invoice Line',
                amount,
              },
            ],
            total_amount: amount,
          });
          showToast({ title: 'Invoice created', variant: 'success' });
          break;
        }
        case 'bills': {
          if (!formValues.vendor_uuid) {
            throw new Error('Vendor is required for a vendor bill.');
          }
          const amount = Number(formValues.amount ?? 0);
          if (Number.isNaN(amount) || amount <= 0) {
            throw new Error('Amount must be a positive number.');
          }
          await createVendorBill({
            project_uuid: formValues.project_uuid || undefined,
            purchase_order_uuid: formValues.purchase_order_uuid || undefined,
            vendor_uuid: formValues.vendor_uuid,
            date: formValues.date,
            due_date: formValues.due_date || undefined,
            status: formValues.status,
            items: [
              {
                description: formValues.item_description || 'Vendor Bill Line',
                amount,
              },
            ],
            total_amount: amount,
          });
          showToast({ title: 'Vendor bill created', variant: 'success' });
          break;
        }
        case 'expenses': {
          if (!formValues.project_uuid) {
            throw new Error('Project is required for an expense.');
          }
          if (!formValues.description) {
            throw new Error('Description is required for an expense.');
          }
          const amount = Number(formValues.amount ?? 0);
          if (Number.isNaN(amount) || amount <= 0) {
            throw new Error('Amount must be a positive number.');
          }
          await createExpense({
            project_uuid: formValues.project_uuid,
            user_uuid: formValues.user_uuid || undefined,
            description: formValues.description,
            amount,
            date: formValues.date,
            billable: formValues.billable === 'true',
            status: formValues.status,
          });
          showToast({ title: 'Expense recorded', variant: 'success' });
          break;
        }
        default:
          break;
      }

      closeCreateModal();
      loadFinanceData();
    } catch (error) {
      console.error('Failed to create record', error);
      showToast({
        title: 'Failed to save record',
        description: error instanceof Error ? error.message : undefined,
        variant: 'error',
      });
    } finally {
      setCreating(false);
    }
  };
  const financeData = useMemo(
    () => ({
      sales_orders: salesOrders,
      purchase_orders: purchaseOrders,
      invoices,
      bills: vendorBills,
      expenses,
    }),
    [expenses, invoices, purchaseOrders, salesOrders, vendorBills],
  );

  const isModalDataLoading = useMemo(() => !referencesLoaded, [referencesLoaded]);

  const tabs = [
    { id: 'sales_orders', label: 'Sales Orders', icon: ShoppingCart },
    { id: 'purchase_orders', label: 'Purchase Orders', icon: FileText },
    { id: 'invoices', label: 'Customer Invoices', icon: Receipt },
    { id: 'bills', label: 'Vendor Bills', icon: CreditCard },
    { id: 'expenses', label: 'Expenses', icon: Wallet },
  ];

  const statusColors: Record<string, 'success' | 'info' | 'warning' | 'default'> = {
    draft: 'warning',
    approved: 'success',
    sent: 'info',
    paid: 'success',
    declined: 'default',
  };

  const formatAmount = (value: number | null | undefined) => {
    const amount = Number(value ?? 0);
    if (!amount) return '₹0';
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`;
    }
    if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(1)}K`;
    }
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const getStatusVariant = (status: string) => statusColors[status] ?? 'default';

  const renderRow = (item: SalesOrder | PurchaseOrder | Invoice | VendorBill | Expense) => {
    switch (activeTab) {
      case 'sales_orders': {
        const order = item as SalesOrder;
        return (
          <>
            <td className="py-3 px-4 text-sm font-medium text-slate-100">SO-{order.uuid.slice(0, 8).toUpperCase()}</td>
            <td className="py-3 px-4 text-sm text-slate-300">{order.client?.name ?? '—'}</td>
            <td className="py-3 px-4 text-sm text-slate-300">{new Date(order.date).toLocaleDateString()}</td>
            <td className="py-3 px-4 text-sm font-semibold text-slate-100">{formatAmount(order.total_amount)}</td>
            <td className="py-3 px-4">
              <Badge variant={getStatusVariant(order.status)} size="sm">
                {order.status}
              </Badge>
            </td>
          </>
        );
      }
      case 'purchase_orders': {
        const order = item as PurchaseOrder;
        return (
          <>
            <td className="py-3 px-4 text-sm font-medium text-slate-100">PO-{order.uuid.slice(0, 8).toUpperCase()}</td>
            <td className="py-3 px-4 text-sm text-slate-300">{order.vendor?.name ?? '—'}</td>
            <td className="py-3 px-4 text-sm text-slate-300">{new Date(order.date).toLocaleDateString()}</td>
            <td className="py-3 px-4 text-sm font-semibold text-slate-100">{formatAmount(order.total_amount)}</td>
            <td className="py-3 px-4">
              <Badge variant={getStatusVariant(order.status)} size="sm">
                {order.status}
              </Badge>
            </td>
          </>
        );
      }
      case 'invoices': {
        const invoice = item as Invoice;
        return (
          <>
            <td className="py-3 px-4 text-sm font-medium text-slate-100">INV-{invoice.uuid.slice(0, 8).toUpperCase()}</td>
            <td className="py-3 px-4 text-sm text-slate-300">{invoice.client?.name ?? '—'}</td>
            <td className="py-3 px-4 text-sm text-slate-300">{new Date(invoice.date).toLocaleDateString()}</td>
            <td className="py-3 px-4 text-sm font-semibold text-slate-100">{formatAmount(invoice.total_amount)}</td>
            <td className="py-3 px-4">
              <Badge variant={getStatusVariant(invoice.status)} size="sm">
                {invoice.status}
              </Badge>
            </td>
          </>
        );
      }
      case 'bills': {
        const bill = item as VendorBill;
        return (
          <>
            <td className="py-3 px-4 text-sm font-medium text-slate-100">BILL-{bill.uuid.slice(0, 8).toUpperCase()}</td>
            <td className="py-3 px-4 text-sm text-slate-300">{bill.vendor?.name ?? '—'}</td>
            <td className="py-3 px-4 text-sm text-slate-300">{new Date(bill.date).toLocaleDateString()}</td>
            <td className="py-3 px-4 text-sm font-semibold text-slate-100">{formatAmount(bill.total_amount)}</td>
            <td className="py-3 px-4">
              <Badge variant={getStatusVariant(bill.status)} size="sm">
                {bill.status}
              </Badge>
            </td>
          </>
        );
      }
      case 'expenses': {
        const expense = item as Expense;
        return (
          <>
            <td className="py-3 px-4 text-sm font-medium text-slate-100">EXP-{expense.uuid.slice(0, 8).toUpperCase()}</td>
            <td className="py-3 px-4 text-sm text-slate-300">{expense.description}</td>
            <td className="py-3 px-4 text-sm text-slate-300">{new Date(expense.date).toLocaleDateString()}</td>
            <td className="py-3 px-4 text-sm font-semibold text-slate-100">{formatAmount(expense.amount)}</td>
            <td className="py-3 px-4">
              <Badge variant={getStatusVariant(expense.status)} size="sm">
                {expense.status}
              </Badge>
            </td>
          </>
        );
      }
      default:
        return null;
    }
  };

  const rows = financeData[activeTab as keyof typeof financeData] ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Finance Hub</h1>
          <p className="text-slate-400">Manage orders, invoices, bills, and expenses</p>
        </div>
        <Button onClick={openCreateModal}>Create New</Button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all
                ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'bg-slate-800/50 text-slate-300 border border-slate-700/50 hover:border-slate-600'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{tabs.find((t) => t.id === activeTab)?.label}</CardTitle>
        </CardHeader>
        <CardBody>
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
              {error}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Record</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">
                    {activeTab === 'expenses' ? 'Description' : 'Partner/Vendor'}
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Amount</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400 text-sm">
                      Loading finance records...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400 text-sm">
                      No records found.
                    </td>
                  </tr>
                ) : (
                  rows.map((item) => (
                    <tr key={(item as any).uuid} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                      {renderRow(item)}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      <CreateFinanceModal
        isOpen={isCreateOpen}
        activeTab={activeTab}
        loading={isModalDataLoading}
        submitting={creating}
        values={formValues}
        projects={projectsRef}
        clients={clientsRef}
        vendors={vendorsRef}
        users={usersRef}
        salesOrders={salesOrders}
        purchaseOrders={purchaseOrders}
        onClose={closeCreateModal}
        onFieldChange={handleFieldChange}
        onSubmit={handleCreateRecord}
      />
    </div>
  );
}

function CreateFinanceModal({
  isOpen,
  activeTab,
  loading,
  submitting,
  values,
  projects,
  clients,
  vendors,
  users,
  salesOrders,
  purchaseOrders,
  onClose,
  onFieldChange,
  onSubmit
}: CreateFinanceModalProps) {
  const projectOptions = useMemo(
    () => [{ value: '', label: 'Unassigned' }, ...projects.map((project) => ({ value: project.uuid, label: project.name }))],
    [projects]
  )

  const clientOptions = useMemo(
    () => [{ value: '', label: 'Select client' }, ...clients.map((client) => ({ value: client.uuid, label: client.name }))],
    [clients]
  )

  const vendorOptions = useMemo(
    () => [{ value: '', label: 'Select vendor' }, ...vendors.map((vendor) => ({ value: vendor.uuid, label: vendor.name }))],
    [vendors]
  )

  const userOptions = useMemo(
    () => [{ value: '', label: 'Select user' }, ...users.map((user) => ({ value: user.uuid, label: `${user.name} (${user.role})` }))],
    [users]
  )

  const salesOrderOptions = useMemo(
    () => [{ value: '', label: 'Unlinked' }, ...salesOrders.map((order) => ({ value: order.uuid, label: order.client?.name ?? order.uuid }))],
    [salesOrders]
  )

  const purchaseOrderOptions = useMemo(
    () => [{ value: '', label: 'Unlinked' }, ...purchaseOrders.map((order) => ({ value: order.uuid, label: order.vendor?.name ?? order.uuid }))],
    [purchaseOrders]
  )

  const renderSalesOrderForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select label="Project" value={values.project_uuid ?? ''} onChange={onFieldChange('project_uuid')} options={projectOptions} />
        <Select label="Client" value={values.client_uuid ?? ''} onChange={onFieldChange('client_uuid')} options={clientOptions} />
        <Input label="Date" type="date" value={values.date ?? ''} onChange={onFieldChange('date')} />
        <Select
          label="Status"
          value={values.status ?? ORDER_STATUSES[0]}
          onChange={onFieldChange('status')}
          options={ORDER_STATUSES.map((status) => ({ value: status, label: status.replace('_', ' ') }))}
        />
        <Input label="Quantity" type="number" min="1" value={values.quantity ?? '1'} onChange={onFieldChange('quantity')} />
        <Input
          label="Unit Price (₹)"
          type="number"
          min="0"
          step="0.01"
          value={values.unit_price ?? ''}
          onChange={onFieldChange('unit_price')}
          placeholder="5000"
        />
      </div>
      <Input
        label="Item Description"
        value={values.item_description ?? ''}
        onChange={onFieldChange('item_description')}
        placeholder="Implementation services"
      />
    </div>
  )

  const renderPurchaseOrderForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select label="Project" value={values.project_uuid ?? ''} onChange={onFieldChange('project_uuid')} options={projectOptions} />
        <Select label="Vendor" value={values.vendor_uuid ?? ''} onChange={onFieldChange('vendor_uuid')} options={vendorOptions} />
        <Input label="Date" type="date" value={values.date ?? ''} onChange={onFieldChange('date')} />
        <Select
          label="Status"
          value={values.status ?? ORDER_STATUSES[0]}
          onChange={onFieldChange('status')}
          options={ORDER_STATUSES.map((status) => ({ value: status, label: status.replace('_', ' ') }))}
        />
        <Input label="Quantity" type="number" min="1" value={values.quantity ?? '1'} onChange={onFieldChange('quantity')} />
        <Input
          label="Unit Price (₹)"
          type="number"
          min="0"
          step="0.01"
          value={values.unit_price ?? ''}
          onChange={onFieldChange('unit_price')}
          placeholder="2500"
        />
      </div>
      <Input
        label="Item Description"
        value={values.item_description ?? ''}
        onChange={onFieldChange('item_description')}
        placeholder="Vendor service"
      />
    </div>
  )

  const renderInvoiceForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select label="Project" value={values.project_uuid ?? ''} onChange={onFieldChange('project_uuid')} options={projectOptions} />
        <Select label="Client" value={values.client_uuid ?? ''} onChange={onFieldChange('client_uuid')} options={clientOptions} />
        <Select
          label="Linked Sales Order"
          value={values.sales_order_uuid ?? ''}
          onChange={onFieldChange('sales_order_uuid')}
          options={salesOrderOptions}
        />
        <Input label="Invoice Date" type="date" value={values.date ?? ''} onChange={onFieldChange('date')} />
        <Input label="Due Date" type="date" value={values.due_date ?? ''} onChange={onFieldChange('due_date')} />
        <Select
          label="Status"
          value={values.status ?? ORDER_STATUSES[0]}
          onChange={onFieldChange('status')}
          options={ORDER_STATUSES.map((status) => ({ value: status, label: status.replace('_', ' ') }))}
        />
        <Input
          label="Amount (₹)"
          type="number"
          min="0"
          step="0.01"
          value={values.amount ?? ''}
          onChange={onFieldChange('amount')}
          placeholder="75000"
        />
      </div>
      <Input
        label="Line Description"
        value={values.item_description ?? ''}
        onChange={onFieldChange('item_description')}
        placeholder="Consulting services"
      />
    </div>
  )

  const renderVendorBillForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select label="Project" value={values.project_uuid ?? ''} onChange={onFieldChange('project_uuid')} options={projectOptions} />
        <Select label="Vendor" value={values.vendor_uuid ?? ''} onChange={onFieldChange('vendor_uuid')} options={vendorOptions} />
        <Select
          label="Linked Purchase Order"
          value={values.purchase_order_uuid ?? ''}
          onChange={onFieldChange('purchase_order_uuid')}
          options={purchaseOrderOptions}
        />
        <Input label="Bill Date" type="date" value={values.date ?? ''} onChange={onFieldChange('date')} />
        <Input label="Due Date" type="date" value={values.due_date ?? ''} onChange={onFieldChange('due_date')} />
        <Select
          label="Status"
          value={values.status ?? ORDER_STATUSES[0]}
          onChange={onFieldChange('status')}
          options={ORDER_STATUSES.map((status) => ({ value: status, label: status.replace('_', ' ') }))}
        />
        <Input
          label="Amount (₹)"
          type="number"
          min="0"
          step="0.01"
          value={values.amount ?? ''}
          onChange={onFieldChange('amount')}
          placeholder="32000"
        />
      </div>
      <Input
        label="Line Description"
        value={values.item_description ?? ''}
        onChange={onFieldChange('item_description')}
        placeholder="Vendor charges"
      />
    </div>
  )

  const renderExpenseForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select label="Project" value={values.project_uuid ?? ''} onChange={onFieldChange('project_uuid')} options={projectOptions} />
        <Select label="User" value={values.user_uuid ?? ''} onChange={onFieldChange('user_uuid')} options={userOptions} />
        <Input
          label="Amount (₹)"
          type="number"
          min="0"
          step="0.01"
          value={values.amount ?? ''}
          onChange={onFieldChange('amount')}
          placeholder="1500"
        />
        <Input label="Date" type="date" value={values.date ?? ''} onChange={onFieldChange('date')} />
        <Select
          label="Status"
          value={values.status ?? EXPENSE_STATUSES[0]}
          onChange={onFieldChange('status')}
          options={EXPENSE_STATUSES.map((status) => ({ value: status, label: status.replace('_', ' ') }))}
        />
        <Select
          label="Billable"
          value={values.billable ?? 'true'}
          onChange={onFieldChange('billable')}
          options={[
            { value: 'true', label: 'Billable' },
            { value: 'false', label: 'Non-billable' },
          ]}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
        <textarea
          className="w-full min-h-[120px] px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
          value={values.description ?? ''}
          onChange={onFieldChange('description')}
          placeholder="Travel reimbursement"
        />
      </div>
    </div>
  )

  const renderContent = () => {
    switch (activeTab) {
      case 'sales_orders':
        return renderSalesOrderForm()
      case 'purchase_orders':
        return renderPurchaseOrderForm()
      case 'invoices':
        return renderInvoiceForm()
      case 'bills':
        return renderVendorBillForm()
      case 'expenses':
        return renderExpenseForm()
      default:
        return null
    }
  }

  const modalTitleMap: Record<string, string> = {
    sales_orders: 'Create Sales Order',
    purchase_orders: 'Create Purchase Order',
    invoices: 'Create Invoice',
    bills: 'Create Vendor Bill',
    expenses: 'Log Expense',
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitleMap[activeTab] ?? 'Create'} size="xl">
      {loading ? (
        <div className="flex items-center gap-3 text-slate-300">
          <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span>Loading reference data...</span>
        </div>
      ) : (
        <>
          {renderContent()}
          <div className="flex justify-end gap-3 pt-6">
            <Button variant="ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={onSubmit} disabled={submitting}>
              {submitting ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </>
      )}
    </Modal>
  )
}
