import express from 'express'
import passport from 'passport'

import wordController from './wordController'

const wordRoute = express.Router()

wordRoute
  .route('/refresh')
  .get(
    passport.authenticate('passport-jwt', { session: false }),
    wordController.refreshWords
  )
wordRoute
  .route('/forget')
  .get(
    passport.authenticate('passport-jwt', { session: false }),
    wordController.getForgetWords
  )
wordRoute
  .route('/level')
  .get(
    passport.authenticate('passport-jwt', { session: false }),
    wordController.getLevelWords
  )

export default wordRoute
