import mongoose, { Schema } from 'mongoose'

import modelConfig from './modelConfig'

const noteSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    title: {
      type: String,
      required: true
    },
    videoId: {
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
      ],
      required: true
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
      ],
      required: true
    },
    subs: {
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
          }
        }
      ],
      required: true
    }
  },
  modelConfig
)

noteSchema.index({ userId: 1, link: 1 }, { unique: true })
const noteModel = mongoose.model('note', noteSchema)
export default noteModel
