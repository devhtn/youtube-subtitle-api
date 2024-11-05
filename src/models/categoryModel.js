import mongoose from 'mongoose'

import modelConfig from './modelConfig'

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    exercisesCount: {
      type: Number,
      default: 0
    }
  },
  modelConfig
)

const categoryModel = mongoose.model('Category', categorySchema)
export default categoryModel
