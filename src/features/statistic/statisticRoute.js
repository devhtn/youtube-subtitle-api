import express from 'express'
import passport from 'passport'

import statisticController from './statisticController'

const statisticRoute = express.Router()

statisticRoute
  .route('')
  .post(
    passport.authenticate('passport-jwt', { session: false }),
    statisticController.createNewDay
  )
statisticRoute
  .route('')
  .patch(
    passport.authenticate('passport-jwt', { session: false }),
    statisticController.updateDay
  )
statisticRoute
  .route('')
  .get(
    passport.authenticate('passport-jwt', { session: false }),
    statisticController.getDays
  )

export default statisticRoute
