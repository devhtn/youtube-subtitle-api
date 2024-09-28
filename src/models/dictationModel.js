import mongoose, { Schema } from 'mongoose'

import modelConfig from './modelConfig'

const dictationSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    noteId: {
      type: Schema.Types.ObjectId,
      ref: 'Note',
      required: true
    },
    countWords: {
      type: Number,
      required: true
    },
    countCompletedWords: {
      type: Number,
      default: 0
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
          },
          note: {
            type: String
          },
          dictationWords: {
            type: [
              {
                word: {
                  type: String,
                  required: true
                },
                isCompleted: {
                  type: Boolean,
                  required: true,
                  default: false
                }
              }
            ],
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

dictationSchema.index({ userId: 1, noteId: 1 }, { unique: true })
const dictationModel = mongoose.model('dictation', dictationSchema)
export default dictationModel
