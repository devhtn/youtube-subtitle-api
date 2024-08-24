import mongoose, { Schema } from 'mongoose'

import modelConfig from './modelConfig'

const adminSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    password: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ['admin', 'editor'],
      default: 'admin'
    }
  },
  modelConfig
)
const adminModel = mongoose.model('admin', adminSchema)
// email is only unique if it has a value
const createIndexes = async () => {
  try {
    await adminModel.collection.createIndex(
      { email: 1 },
      { unique: true, sparse: true }
    )
  } catch (error) {
    console.error('Error creating index')
  }
}
createIndexes()
export default adminModel
