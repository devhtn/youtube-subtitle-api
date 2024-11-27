import 'dotenv/config'

const env = {
  // config env
  MONGO_URI: process.env.MONGO_URI,
  CLIENT_URL: process.env.CLIENT_URL,
  HOST: process.env.HOST,
  PORT: process.env.PORT,
  TOKEN_SECRET: process.env.TOKEN_SECRET,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  CLOUDINARY_NAME: process.env.CLOUDINARY_NAME,
  CLOUDINARY_KEY: process.env.CLOUDINARY_KEY,
  CLOUDINARY_SECRET: process.env.CLOUDINARY_SECRET
  // app env
}

export default env
