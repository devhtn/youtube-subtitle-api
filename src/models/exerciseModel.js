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
    completedCount: {
      type: Number,
      default: 0
    },
    likesCount: {
      type: Number,
      default: 0
    },
    shareUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    isPublic: {
      type: Boolean,
      default: false
    },
    title: {
      type: String,
      required: true
    },
    category: {
      type: String,
      require: true
    },
    duration: {
      type: String,
      required: true
    },
    totalDictationWords: {
      type: Number,
      required: true
    },
    totalDictationUniqWords: {
      type: Number,
      required: true
    },
    avgSpeed: {
      type: Number,
      required: true
    },
    checkList: [
      {
        name: {
          type: String,
          required: true
        },
        desc: {
          type: String,
          required: true
        },
        match: {
          type: Number,
          required: true
        }
      }
    ],
    thumbnails: {
      type: [
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
      ]
    },
    chapters: {
      type: [
        {
          title: {
            type: String,
            required: true
          },
          start_time: {
            type: Number,
            required: true
          }
        }
      ]
    },
    segments: {
      type: [
        {
          start: {
            type: Number,
            required: true // startTime là bắt buộc
          },
          end: {
            type: Number,
            required: true // endTime là bắt buộc
          },
          text: {
            type: String,
            required: true // text là bắt buộc
          },
          transText: {
            type: String,
            required: true // text là bắt buộc
          },
          dictationWords: {
            type: [String],
            validate: {
              validator: function (array) {
                return array.length > 0 // Kiểm tra phải có ít nhất 1 phần tử
              },
              message: 'DictationWords must contain at least one word.'
            }
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
