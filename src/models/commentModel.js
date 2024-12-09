import mongoose from 'mongoose'

import modelConfig from './modelConfig'

const commentSchema = new mongoose.Schema(
  {
    exerciseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exercise',
      required: true
    },
    state: {
      type: String,
      enum: ['public', 'hidden'],
      default: 'public'
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      default: null
    },
    replies: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment'
      }
    ],
    mentionUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  },
  modelConfig
)

commentSchema.pre('save', function (next) {
  this.updatedAt = Date.now()
  next()
})

const commentModel = mongoose.model('Comment', commentSchema)
export default commentModel
