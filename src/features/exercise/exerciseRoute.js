import express from 'express'
import passport from 'passport'

import exerciseController from './exerciseController'
import authorize from '~/middlewares/authorize'

const exerciseRoute = express.Router()

exerciseRoute
  .route('/check-video')
  .post(
    passport.authenticate('passport-jwt', { session: false }),
    exerciseController.checkVideo
  )
exerciseRoute
  .route('')
  .post(
    passport.authenticate('passport-jwt', { session: false }),
    exerciseController.createExercise
  )
exerciseRoute
  .route('/dictation/:id')
  .get(
    passport.authenticate('passport-jwt', { session: false }),
    authorize('user'),
    exerciseController.getDictation
  )
exerciseRoute
  .route('/dictation/:dictationId/segment/:segmentId/process')
  .patch(
    passport.authenticate('passport-jwt', { session: false }),
    authorize('user'),
    exerciseController.updateDictationProcess
  )
exerciseRoute
  .route('/dictation/:dictationId/segment/:segmentId/note')
  .patch(
    passport.authenticate('passport-jwt', { session: false }),
    authorize('user'),
    exerciseController.updateDictationSegmentNote
  )
exerciseRoute
  .route('')
  .get(
    passport.authenticate('passport-jwt', { session: false }),
    exerciseController.getExercises
  )
exerciseRoute
  .route('/user-dictation')
  .get(
    passport.authenticate('passport-jwt', { session: false }),
    exerciseController.getUserDictations
  )
exerciseRoute
  .route('/:videoId')
  .get(
    passport.authenticate('passport-jwt', { session: false }),
    exerciseController.getExercise
  )
exerciseRoute
  .route('/:exerciseId/comment')
  .post(
    passport.authenticate('passport-jwt', { session: false }),
    exerciseController.createComment
  )
exerciseRoute
  .route('/:exerciseId/comment')
  .get(
    passport.authenticate('passport-jwt', { session: false }),
    exerciseController.getExerciseComments
  )
exerciseRoute
  .route('/comment/toggle-like')
  .post(
    passport.authenticate('passport-jwt', { session: false }),
    exerciseController.toggleLikeComment
  )
exerciseRoute
  .route('/toggle-like')
  .post(
    passport.authenticate('passport-jwt', { session: false }),
    exerciseController.toggleLikeList
  )

export default exerciseRoute
