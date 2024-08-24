import 'express-async-errors'

import cors from 'cors'
import express from 'express'

import connectDB from './config/db'
import env from './config/env'
import handleError from './middlewares/handleError'
import routerV1 from './routers/v1'

const SERVER = () => {
  const app = express()

  app.use(cors())
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  // router
  app.use('/v1', routerV1)

  // handle error
  app.use(handleError)

  app.listen(env.PORT, env.HOST, () => {
    console.log(`Server is running at port:${process.env.PORT}`)
  })
}

connectDB().then(() => SERVER())
