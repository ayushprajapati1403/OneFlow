import { Router } from 'express'
import Controller from './AuthController'
import Validations from './AuthValidations'
import Authorization from '../../../middlewares/authorization'
import { ROLE_TYPES } from '../../../utils/constants'

const router = Router()

// Public auth flows
router.post('/signup', Validations.signUp, Controller.signUp.bind(Controller))
router.post('/login', Validations.signIn, Controller.signIn.bind(Controller))

// Authenticated user flows
router.get('/me', Authorization.isProtectedRouteAuthorized, Controller.me.bind(Controller))
router.put(
  '/me/password',
  Authorization.isProtectedRouteAuthorized,
  Validations.changePassword,
  Controller.changePassword.bind(Controller)
)

// Admin-only user management
router.get(
  '/users',
  Authorization.isProtectedRouteAuthorized,
  Authorization.requireRoles(ROLE_TYPES.ADMIN),
  Controller.listUsers.bind(Controller)
)

router.post(
  '/users',
  Authorization.isProtectedRouteAuthorized,
  Authorization.requireRoles(ROLE_TYPES.ADMIN),
  Validations.createUser,
  Controller.createUser.bind(Controller)
)

router.get(
  '/users/:id',
  Authorization.isProtectedRouteAuthorized,
  Authorization.requireRoles(ROLE_TYPES.ADMIN),
  Controller.getUser.bind(Controller)
)

router.put(
  '/users/:id',
  Authorization.isProtectedRouteAuthorized,
  Authorization.requireRoles(ROLE_TYPES.ADMIN),
  Validations.updateUser,
  Controller.updateUser.bind(Controller)
)

router.delete(
  '/users/:id',
  Authorization.isProtectedRouteAuthorized,
  Authorization.requireRoles(ROLE_TYPES.ADMIN),
  Controller.deleteUser.bind(Controller)
)

export default router
