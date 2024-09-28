import 'express-async-errors'

import cors from 'cors'
import express from 'express'
import passport from 'passport'

import connectDB from './config/db'
import env from './config/env'
import handleError from './middlewares/handleError'
import routerV1 from './router/v1'

import '~/config/passport'

const SERVER = () => {
  const app = express()

  app.use(cors())
  app.use(express.json({ limit: '50mb' }))
  app.use(express.urlencoded({ limit: '50mb', extended: true }))
  // auth
  app.use(passport.initialize())
  // router
  app.use('/v1', routerV1)

  // handle error
  app.use(handleError)

  app.listen(env.PORT, env.HOST, () => {
    console.log(`Server is running at port:${process.env.PORT}`)
  })
}

connectDB()
  .then(() => SERVER())
  .catch((err) => {
    console.log({ err })
    process.exit(1)
  })
