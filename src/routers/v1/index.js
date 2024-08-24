import express from 'express'

import authRoute from '~/features/auth/authRoute'

const routerV1 = express.Router()

routerV1.get('/status', (req, res) => {
  res.status(200).json({ message: 'APIs_V1 ready' })
})

routerV1.use('/auth', authRoute)

export default routerV1
