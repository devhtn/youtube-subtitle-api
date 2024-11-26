import express from 'express'
import passport from 'passport'

import authController from './authController'

const authRoute = express.Router()

authRoute.route('/login').post(authController.login)
authRoute.route('/register').post(authController.register)
authRoute.route('/google-login').post(authController.googleLogin)
authRoute
  .route('')
  .get(
    passport.authenticate('passport-jwt', { session: false }),
    authController.getUser
  )
authRoute
  .route('/statistic')
  .get(
    passport.authenticate('passport-jwt', { session: false }),
    authController.getUserStatistic
  )
authRoute
  .route('/ranking')
  .get(
    passport.authenticate('passport-jwt', { session: false }),
    authController.getRankingUsers
  )

export default authRoute
