import { Router } from 'express'
import Controller from './TaskController'
import Validations from './TaskValidations'
import Authorization from '../../../middlewares/authorization'
import { ROLE_TYPES } from '../../../utils/constants'

const router = Router()

router.get('/', Authorization.isProtectedRouteAuthorized, Validations.list, Controller.list.bind(Controller))
router.get('/:uuid', Authorization.isProtectedRouteAuthorized, Controller.get.bind(Controller))

const TASK_WRITE_ROLES = [ROLE_TYPES.ADMIN, ROLE_TYPES.PROJECT_MANAGER]

router.post('/', Authorization.isProtectedRouteAuthorized, Authorization.requireRoles(...TASK_WRITE_ROLES), Validations.create, Controller.create.bind(Controller))

router.put('/:uuid', Authorization.isProtectedRouteAuthorized, Authorization.requireRoles(...TASK_WRITE_ROLES), Validations.update, Controller.update.bind(Controller))

router.delete('/:uuid', Authorization.isProtectedRouteAuthorized, Authorization.requireRoles(...TASK_WRITE_ROLES), Controller.remove.bind(Controller))

export default router
