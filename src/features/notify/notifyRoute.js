import express from 'express'
import passport from 'passport'

import notifyController from './notifyController'

const notifyRoute = express.Router()

notifyRoute
  .route('/user')
  .get(
    passport.authenticate('passport-jwt', { session: false }),
    notifyController.getUserNotifies
  )
notifyRoute
  .route('/:id')
  .patch(
    passport.authenticate('passport-jwt', { session: false }),
    notifyController.updateNotify
  )
notifyRoute
  .route('/:id')
  .delete(
    passport.authenticate('passport-jwt', { session: false }),
    notifyController.deleteNotify
  )

export default notifyRoute
