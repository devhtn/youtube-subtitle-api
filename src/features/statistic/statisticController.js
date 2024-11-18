import statisticService from './statisticService'

const createNewDay = async (req, res) => {
  const userId = req.user.id
  const response = await statisticService.createNewDay(userId)
  return res.status(201).json(response)
}
const updateDay = async (req, res) => {
  const userId = req.user.id
  const dataFields = req.body
  const response = await statisticService.updateDay(userId, dataFields)
  return res.status(201).json(response)
}
const getDays = async (req, res) => {
  const query = req.query
  const response = await statisticService.getDays(query)
  return res.status(201).json(response)
}

const statisticController = {
  getDays,
  updateDay,
  createNewDay
}

export default statisticController
