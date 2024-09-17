import mongoose from 'mongoose'

import env from './env'

const connectDB = async () => {
  try {
    await mongoose.connect(env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000
    })
    console.log('Connect DB successfully!')
  } catch (error) {
    console.log('Time out! Connect DB fail!')
    console.error(`Error: ${error.message}`)
  }
}

export default connectDB
