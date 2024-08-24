import authService from './authService'

const adminRegister = async (req, res) => {
  const user = await authService.adminRegister(req.body)
  res.status(201).json(user)
}
const adminLogin = async (req, res) => {
  const result = await authService.adminLogin(req.body)
  console.log(result)
  return res.status(201).json(result)
}

const authController = {
  adminRegister,
  adminLogin
}

export default authController
