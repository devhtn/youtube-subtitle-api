import MyError from '~/utils/MyError'

import authService from './authService'

const register = async (req, res) => {
  const info = req.body
  const user = await authService.register(info)
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

const authController = {
  getUser,
  register,
  login,
  googleLogin
}

export default authController
