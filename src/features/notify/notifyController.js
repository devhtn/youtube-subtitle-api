import notifyService from './notifyService'

const getUserNotifies = async (req, res) => {
  const userId = req.user.id
  const response = await notifyService.getUserNotifies(userId)
  res.status(201).json(response)
}
const updateNotify = async (req, res) => {
  const { id } = req.params
  const dataFields = req.body
  const response = await notifyService.updateNotify(id, dataFields)
  res.status(201).json(response)
}

const deleteNotify = async (req, res) => {
  const { id } = req.params
  const response = await notifyService.deleteNotify(id)
  res.status(201).json(response)
}

const notifyController = { getUserNotifies, updateNotify, deleteNotify }
export default notifyController
