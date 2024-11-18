import express from 'express'

import authRoute from '~/features/auth/authRoute'
import commentRoute from '~/features/comment/commentRoute'
import exerciseRoute from '~/features/exercise/exerciseRoute'
import notifyRoute from '~/features/notify/notifyRoute'
import statisticRoute from '~/features/statistic/statisticRoute'
import wordRoute from '~/features/word/wordRoute'

const routerV1 = express.Router()

routerV1.get('/status', (req, res) => {
  res.status(200).json({ message: 'APIs_V1 ready' })
})

routerV1.use('/auth', authRoute)
routerV1.use('/exercise', exerciseRoute)
routerV1.use('/comment', commentRoute)
routerV1.use('/word', wordRoute)
routerV1.use('/statistic', statisticRoute)
routerV1.use('/notify', notifyRoute)

export default routerV1
