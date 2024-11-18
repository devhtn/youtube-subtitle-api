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
      required: true,
      unique: true
    },
    level: {
      type: Number,
      default: 1
    },
    startAt: {
      type: Number,
      required: true
    },
    expired: {
      type: Boolean,
      default: false
    }
  },
  modelConfig
)

const wordModel = mongoose.model('Word', wordSchema)
export default wordModel
