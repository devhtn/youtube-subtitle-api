import mongoose, { Schema } from 'mongoose'

import modelConfig from './modelConfig'

const exerciseSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    videoId: {
      type: String,
      required: true,
      unique: true
    },
    category: {
      type: String,
      required: true
    },
    completedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    likedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    dislikedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    commentedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    commentedCount: {
      type: Number,
      default: 0
    },
    firstUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    state: {
      type: String,
      enum: ['private', 'public', 'hidden'],
      default: 'private'
    },
    title: {
      type: String,
      required: true
    },
    duration: {
      type: Number,
      required: true
    },
    totalDictationWords: {
      type: Number,
      required: true
    },
    lemmaWords: [String],
    avgSpeed: {
      type: Number,
      required: true
    },
    difficult: {
      type: Number,
      required: true
    },
    thumbnails: [
      {
        url: {
          type: String,
          required: true
        },
        width: {
          type: Number,
          required: true
        },
        height: {
          type: String,
          required: true
        }
      }
    ],
    segments: {
      type: [
        {
          start: {
            type: Number
          },
          end: {
            type: Number
          },
          text: {
            type: String
          },
          tags: [],
          transText: {
            type: String
          },
          dictationWords: {
            type: [String]
          },
          lemmaSegmentWords: {
            type: [String]
          }
        }
      ],
      validate: {
        validator: function (array) {
          return array.length > 0 // Kiểm tra phải có ít nhất 1 phần tử
        },
        message: 'Subs must contain at least one segment.'
      }
    }
  },
  modelConfig
)

exerciseSchema.index({ userId: 1, videoId: 1 }, { unique: true })
const exerciseModel = mongoose.model('Exercise', exerciseSchema)
export default exerciseModel
