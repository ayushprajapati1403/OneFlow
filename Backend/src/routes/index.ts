import { Application } from 'express'
import { AuthRoute } from '../components/Auth/v1'
import { CURRENT_API_VERSION, BASE_URL } from '../utils/constants'

export default (app: Application) => {
  app.use(BASE_URL + '/' + CURRENT_API_VERSION + '/Auth', AuthRoute)

}
