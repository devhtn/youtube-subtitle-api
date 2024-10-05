import mongoose, { Schema } from 'mongoose'

import modelConfig from './modelConfig'

const wordListSchema = new Schema(
  {
    name: {
      type: String,
      required: true
    },
    desc: {
      type: String,
      required: true
    },
    words: [String]
  },
  modelConfig
)
const wordListModel = mongoose.model('WordList', wordListSchema)
export default wordListModel
