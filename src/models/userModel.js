import mongoose, { Schema } from 'mongoose'

import modelConfig from './modelConfig'

const adminSchema = new Schema(
  {
    username: {
      type: String,
      required: function () {
        return this.role === 'admin' // Bắt buộc nếu role là admin
      },
      trim: true
    },
    password: {
      type: String,
      required: function () {
        return this.role === 'admin' // Bắt buộc nếu role là admin
      }
    },
    googleId: {
      type: String,
      required: function () {
        return this.role === 'user' // Bắt buộc nếu role là user
      }
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user'
    },
    name: {
      type: String
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    picture: {
      type: String
    }
  },
  modelConfig
)
const userModel = mongoose.model('user', adminSchema)
// email is only unique if it has a value
// const createIndexes = async () => {
//   try {
//     await userModel.collection.createIndex(
//       { email: 1 },
//       { unique: true, sparse: true }
//     )
//   } catch (error) {
//     console.error('Error creating index')
//   }
// }
// createIndexes()
export default userModel
