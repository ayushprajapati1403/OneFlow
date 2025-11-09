import { Application } from 'express'
import { AuthRoute } from '../components/Auth/v1'
import { ContactRoute } from '../components/Contacts/v1'
import { ProjectRoute } from '../components/Projects/v1'
import { TaskRoute } from '../components/Tasks/v1'
import { TimesheetRoute } from '../components/Timesheets/v1'
import { SalesOrderRoute } from '../components/SalesOrders/v1'
import { PurchaseOrderRoute } from '../components/PurchaseOrders/v1'
import { InvoiceRoute } from '../components/Invoices/v1'
import { VendorBillRoute } from '../components/VendorBills/v1'
import { ExpenseRoute } from '../components/Expenses/v1'
import { AnalyticsRoute } from '../components/Analytics/v1'
import { CURRENT_API_VERSION, BASE_URL } from '../utils/constants'

export default (app: Application) => {
  app.use(BASE_URL + '/' + CURRENT_API_VERSION + '/Auth', AuthRoute)
  app.use(BASE_URL + '/' + CURRENT_API_VERSION + '/Contacts', ContactRoute)
  app.use(BASE_URL + '/' + CURRENT_API_VERSION + '/Projects', ProjectRoute)
  app.use(BASE_URL + '/' + CURRENT_API_VERSION + '/Tasks', TaskRoute)
  app.use(BASE_URL + '/' + CURRENT_API_VERSION + '/Timesheets', TimesheetRoute)
  app.use(BASE_URL + '/' + CURRENT_API_VERSION + '/SalesOrders', SalesOrderRoute)
  app.use(BASE_URL + '/' + CURRENT_API_VERSION + '/PurchaseOrders', PurchaseOrderRoute)
  app.use(BASE_URL + '/' + CURRENT_API_VERSION + '/Invoices', InvoiceRoute)
  app.use(BASE_URL + '/' + CURRENT_API_VERSION + '/VendorBills', VendorBillRoute)
  app.use(BASE_URL + '/' + CURRENT_API_VERSION + '/Expenses', ExpenseRoute)
  app.use(BASE_URL + '/' + CURRENT_API_VERSION + '/Analytics', AnalyticsRoute)
}
