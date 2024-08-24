import express from 'express'

import authController from './authController'

const authRoute = express.Router()

authRoute.route('/admin-login').post(authController.adminLogin)
authRoute.route('/admin-register').post(authController.adminRegister)

export default authRoute
