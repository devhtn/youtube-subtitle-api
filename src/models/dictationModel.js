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
    totalSegments: {
      type: Number,
      required: true
    },
    completedSegmentsCount: {
      type: Number,
      default: 0
    },
    segments: {
      type: [
        {
          segmentId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true
          },
          note: {
            type: String
          },
          isCompleted: {
            type: Boolean,
            required: true,
            default: false
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
