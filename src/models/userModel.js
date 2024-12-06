import mongoose, { Schema } from 'mongoose'

import modelConfig from './modelConfig'

const userSchema = new Schema(
  {
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    username: {
      type: String,
      trim: true
    },
    password: {
      type: String,
      required: function () {
        return !!this.username
      }
    },
    googleId: {
      type: String
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user'
    },
    name: {
      type: String
    },
    picture: {
      type: String
    },
    lock: {
      isLock: {
        type: Boolean,
        default: false
      },
      dateOpen: {
        type: Date,
        default: null
      },
      reason: {
        type: String,
        default: ''
      }
    }
  },
  modelConfig
)
userSchema.path('username').validate(function () {
  if (!this.googleId && !this.username) {
    return false
  }
  return true
}, 'User must have either a googleId or a username.')
const userModel = mongoose.model('User', userSchema)
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
