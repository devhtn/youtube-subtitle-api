import express from 'express'
import passport from 'passport'

import commentController from './commentController'

const commentRoute = express.Router()

commentRoute
  .route('')
  .post(
    passport.authenticate('passport-jwt', { session: false }),
    commentController.createComment
  )
commentRoute
  .route('/toggle-like')
  .post(
    passport.authenticate('passport-jwt', { session: false }),
    commentController.toggleLikeComment
  )
commentRoute
  .route('/:exerciseId')
  .get(
    passport.authenticate('passport-jwt', { session: false }),
    commentController.getExerciseComments
  )
commentRoute
  .route('/:commentId')
  .patch(
    passport.authenticate('passport-jwt', { session: false }),
    commentController.toggleHiddenComment
  )

export default commentRoute
