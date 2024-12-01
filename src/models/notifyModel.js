import mongoose from 'mongoose'

import modelConfig from './modelConfig'

const notifySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    message: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['Comment', 'Word', 'Exercise'],
      required: true
    },
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'type' // Liên kết với comment nếu có
    },
    seen: {
      type: Boolean,
      default: false
    }
  },
  modelConfig
)

export const notifyModel = mongoose.model('Notify', notifySchema)
