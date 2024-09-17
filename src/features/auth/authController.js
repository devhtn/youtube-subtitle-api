import authService from './authService'

const adminRegister = async (req, res) => {
  const userInfo = req.body
  // role admin
  userInfo.role = 'admin'
  const user = await authService.adminRegister(userInfo)
  res.status(201).json(user)
}
const adminLogin = async (req, res) => {
  const userInfo = req.body
  const login = await authService.adminLogin(userInfo)
  return res.status(201).json(login)
}

const googleLogin = async (req, res) => {
  const { credential } = req.body
  const login = await authService.googleLogin(credential)

  return res.status(201).json(login)
}

const authController = {
  adminRegister,
  adminLogin,
  googleLogin
}

export default authController
