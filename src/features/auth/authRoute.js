import express from 'express'
import passport from 'passport'

import authController from './authController'
import upload from '~/middlewares/upload'

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
authRoute
  .route('')
  .patch(
    passport.authenticate('passport-jwt', { session: false }),
    upload.single('picture'),
    authController.updateInfo
  )
authRoute
  .route('/lock')
  .patch(
    passport.authenticate('passport-jwt', { session: false }),
    authController.lockUser
  )
authRoute
  .route('/unlock')
  .patch(
    passport.authenticate('passport-jwt', { session: false }),
    authController.unlockUser
  )

export default authRoute
