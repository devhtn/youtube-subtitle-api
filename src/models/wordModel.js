import mongoose from 'mongoose'

import modelConfig from './modelConfig'

const wordSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    word: {
      type: String,
      required: true
    },
    level: {
      type: Number,
      default: 1
    },
    expired: {
      type: Boolean,
      default: false
    },
    start: {
      type: Number
    }
  },
  modelConfig
)

// Middleware để gán `start` là thời gian tạo
wordSchema.pre('save', function (next) {
  if (!this.start) {
    this.start = Date.now() // Gán `start` bằng timestamp hiện tại
  }
  next()
})

const wordModel = mongoose.model('Word', wordSchema)
export default wordModel
