import mongoose from 'mongoose'

import modelConfig from './modelConfig'

const studyStatisticSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    day: {
      type: Date,
      required: true
    },
    dictationWordsCount: {
      type: Number,
      default: 0
    },
    forgetWordsCount: {
      type: Number,
      default: 0
    },
    newWordsCount: {
      type: Number,
      default: 0
    }
  },
  modelConfig
)

// Tạo chỉ mục unique trên userId và day
studyStatisticSchema.index({ userId: 1, day: 1 }, { unique: true })

const studyStatisticModel = mongoose.model(
  'StudyStatistic',
  studyStatisticSchema
)

export default studyStatisticModel
