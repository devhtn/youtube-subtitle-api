import MyError from '~/utils/MyError'

import authService from './authService'

const register = async (req, res) => {
  const body = req.body
  const user = await authService.register(body)
  res.status(201).json(user)
}
const login = async (req, res) => {
  const userInfo = req.body
  const login = await authService.login(userInfo)
  return res.status(201).json(login)
}

const googleLogin = async (req, res) => {
  const { credential } = req.body
  const login = await authService.googleLogin(credential)

  return res.status(201).json(login)
}

const getUser = async (req, res) => {
  const user = req.user
  return res.status(201).json(user)
}

const getUserStatistic = async (req, res) => {
  const response = await authService.getUserStatistic()
  return res.status(201).json(response)
}
const getRankingUsers = async (req, res) => {
  const userId = req.user.id
  const response = await authService.getRankingUsers(userId)
  return res.status(201).json(response)
}

const updateInfo = async (req, res) => {
  const body = req.body
  const userId = req.user.id
  const file = req.file
  const response = await authService.updateInfo(body, file, userId)
  return res.status(201).json(response)
}

const authController = {
  updateInfo,
  getRankingUsers,
  getUserStatistic,
  getUser,
  register,
  login,
  googleLogin
}

export default authController
