import mongoose, { Schema } from 'mongoose'

import modelConfig from './modelConfig'

const dictationSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    exerciseId: {
      type: Schema.Types.ObjectId,
      ref: 'Exercise',
      required: true
    },
    isCompleted: {
      type: Boolean,
      default: false
    },
    replay: {
      type: Boolean,
      default: false
    },
    completedSegmentsCount: {
      type: Number,
      default: 0
    },
    totalCompletedSegments: {
      type: Number,
      required: true
    },
    score: {
      type: Number
    },
    segments: {
      type: [
        {
          segmentId: {
            type: Schema.Types.ObjectId,
            required: true
          },
          note: {
            type: String
          },
          isCompleted: {
            type: Boolean,
            default: false
          },
          attemptsCount: {
            type: Number,
            default: 0
          }
        }
      ]
    }
  },
  modelConfig
)

dictationSchema.index({ userId: 1, exerciseId: 1 }, { unique: true })
const dictationModel = mongoose.model('Dictation', dictationSchema)
export default dictationModel
