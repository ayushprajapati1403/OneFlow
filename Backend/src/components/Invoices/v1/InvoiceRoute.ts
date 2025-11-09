import { Router } from 'express'
import Controller from './InvoiceController'
import Validations from './InvoiceValidations'
import Authorization from '../../../middlewares/authorization'
import { ROLE_TYPES } from '../../../utils/constants'

const router = Router()

router.get('/', Authorization.isProtectedRouteAuthorized, Validations.list, Controller.list.bind(Controller))
router.get('/:uuid', Authorization.isProtectedRouteAuthorized, Controller.get.bind(Controller))

const WRITE_ROLES = [ROLE_TYPES.ADMIN, ROLE_TYPES.PROJECT_MANAGER, ROLE_TYPES.FINANCE]

router.post('/', Authorization.isProtectedRouteAuthorized, Authorization.requireRoles(...WRITE_ROLES), Validations.create, Controller.create.bind(Controller))

router.put('/:uuid', Authorization.isProtectedRouteAuthorized, Authorization.requireRoles(...WRITE_ROLES), Validations.update, Controller.update.bind(Controller))

router.delete('/:uuid', Authorization.isProtectedRouteAuthorized, Authorization.requireRoles(...WRITE_ROLES), Controller.remove.bind(Controller))

export default router
