import express from 'express'
import passport from 'passport'

import noteController from './noteController'
import authorize from '~/middlewares/authorize'

const noteRoute = express.Router()

noteRoute
  .route('/check-video')
  .post(
    passport.authenticate('passport-jwt', { session: false }),
    authorize('user'),
    noteController.checkVideo
  )
noteRoute
  .route('/add-note')
  .post(
    passport.authenticate('passport-jwt', { session: false }),
    authorize('user'),
    noteController.addNote
  )
noteRoute
  .route('/get-dictation/:id')
  .get(
    passport.authenticate('passport-jwt', { session: false }),
    authorize('user'),
    noteController.getDictation
  )
noteRoute
  .route('/update-segment')
  .patch(
    passport.authenticate('passport-jwt', { session: false }),
    authorize('user'),
    noteController.updateSegment
  )

export default noteRoute
