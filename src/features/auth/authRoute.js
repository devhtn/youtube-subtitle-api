import express from 'express'

import authController from './authController'

const authRoute = express.Router()

authRoute.route('/login').post(authController.login)
authRoute.route('/register').post(authController.register)
authRoute.route('/google-login').post(authController.googleLogin)

export default authRoute
