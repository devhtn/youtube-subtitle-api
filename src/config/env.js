import 'dotenv/config'

const env = {
  MONGO_URI: process.env.MONGO_URI,
  CLIENT_URL: process.env.CLIENT_URL,
  HOST: process.env.HOST,
  PORT: process.env.PORT,
  TOKEN_SECRET: process.env.TOKEN_SECRET
}

export default env
