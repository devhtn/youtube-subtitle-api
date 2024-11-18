import 'express-async-errors'

import http from 'http'

import cors from 'cors'
import express from 'express'
import passport from 'passport'
import { Server } from 'socket.io'

import connectDB from './config/db'
import env from './config/env'
import handleError from './middlewares/handleError'
import routerV1 from './router/v1'

import '~/config/passport'

import { setupSocket } from './socket'

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

  // Create HTTP server and integrate Socket.IO
  const server = http.createServer(app)
  const io = new Server(server, {
    cors: {
      origin: 'http://localhost:5174', // Cấu hình CORS theo nhu cầu
      methods: ['GET', 'POST']
    }
  })

  // Setup Socket.IO logic
  setupSocket(io)

  server.listen(env.PORT, env.HOST, () => {
    console.log(`Server is running at port:${env.PORT}`)
  })
}

connectDB()
  .then(() => SERVER())
  .catch((err) => {
    console.log({ err })
    process.exit(1)
  })
