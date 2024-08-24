import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

import MyError from '~/utils/MyError'

import env from '~/config/env'
import adminModel from '~/models/adminModel'

const adminRegister = async (body) => {
  const { username, password } = body
  const isExist = await adminModel.findOne({ username })
  if (isExist) throw new MyError('username already used', 409)
  const hashedPassword = await bcrypt.hash(password, 10)
  body.password = hashedPassword
  const user = new adminModel()
  Object.assign(user, body)
  await user.save()

  // custom returned results
  user.password = undefined
  return user
}

const adminLogin = async (body) => {
  const { username, password } = body
  const user = await adminModel.findOne(
    { username },
    { createdAt: 0, updatedAt: 0 }
  )

  if (!user) throw new MyError('username does not exist', 401)

  const isMatch = await bcrypt.compare(password, user.password)
  if (!isMatch) throw new MyError('password is wrong', 401)

  const payload = { id: user._id, username: user.username, role: user.role }
  const token = jwt.sign(payload, env.TOKEN_SECRET, { expiresIn: '1h' })
  // custom returned results
  const userObject = user.toObject()
  delete userObject.id
  delete userObject.password
  delete userObject.role
  return { token, user: userObject }
}

const authService = {
  adminLogin,
  adminRegister
}
export default authService
