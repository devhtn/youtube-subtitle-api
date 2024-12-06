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
    exerciseController.getDictation
  )
exerciseRoute
  .route('/dictation/:id')
  .patch(
    passport.authenticate('passport-jwt', { session: false }),
    exerciseController.updateDictation
  )
exerciseRoute
  .route('/dictation/:dictationId/segment/:segmentId')
  .patch(
    passport.authenticate('passport-jwt', { session: false }),
    exerciseController.updateDictationSegment
  )
exerciseRoute
  .route('')
  .get(
    passport.authenticate('passport-jwt', { session: false }),
    exerciseController.getExercises
  )
exerciseRoute
  .route('/categories')
  .get(
    passport.authenticate('passport-jwt', { session: false }),
    exerciseController.getCategories
  )
exerciseRoute
  .route('/user-dictation')
  .get(
    passport.authenticate('passport-jwt', { session: false }),
    exerciseController.getUserDictations
  )
exerciseRoute
  .route('/toggle-like')
  .post(
    passport.authenticate('passport-jwt', { session: false }),
    exerciseController.toggleLikeExercise
  )
exerciseRoute
  .route('/toggle-dislike')
  .post(
    passport.authenticate('passport-jwt', { session: false }),
    exerciseController.toggleDislikeExercise
  )
exerciseRoute
  .route('/toggle-lock')
  .patch(
    passport.authenticate('passport-jwt', { session: false }),
    authorize(['admin']),
    exerciseController.toggleLockExercise
  )
exerciseRoute
  .route('/dictation')
  .post(
    passport.authenticate('passport-jwt', { session: false }),
    exerciseController.createDictation
  )
exerciseRoute
  .route('/dictation/:id')
  .delete(
    passport.authenticate('passport-jwt', { session: false }),
    exerciseController.delDictation
  )
exerciseRoute
  .route('/statistic')
  .get(
    passport.authenticate('passport-jwt', { session: false }),
    exerciseController.getExerciseStatistic
  )
// Có params phải để dưới cùng, tránh ảnh hưởng tới những router đầu
exerciseRoute
  .route('/:id')
  .get(
    passport.authenticate('passport-jwt', { session: false }),
    exerciseController.getExercise
  )

export default exerciseRoute
