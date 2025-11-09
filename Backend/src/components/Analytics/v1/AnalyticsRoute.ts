import { Router } from 'express'
import Authorization from '../../../middlewares/authorization'
import Controller from './AnalyticsController'

const router = Router()

router.get(
  '/dashboard',
  Authorization.isProtectedRouteAuthorized,
  Controller.dashboard.bind(Controller)
)

export default router

