import wordService from './wordService'

const refreshWords = async (req, res) => {
  const userId = req.user.id
  const response = await wordService.refreshWords(userId)
  return res.status(201).json(response)
}
const getForgetWords = async (req, res) => {
  const userId = req.user.id
  const response = await wordService.getForgetWords(userId)
  return res.status(201).json(response)
}
const getLevelWords = async (req, res) => {
  const userId = req.user.id
  const response = await wordService.getLevelWords(userId)
  return res.status(201).json(response)
}

const wordController = {
  getForgetWords,
  refreshWords,
  getLevelWords
}

export default wordController
