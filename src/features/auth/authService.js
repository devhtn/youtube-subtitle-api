import bcrypt from 'bcrypt'
import { OAuth2Client } from 'google-auth-library'
import jwt from 'jsonwebtoken'

import MyError from '~/utils/MyError'

import env from '~/config/env'
import userModel from '~/models/userModel'

const register = async (info) => {
  const { username, password } = info
  const isExist = await userModel.findOne({ username })
  if (isExist) throw new MyError('username already used', 409)
  const hashedPassword = await bcrypt.hash(password, 10)
  info.password = hashedPassword
  const user = new userModel()
  Object.assign(user, info)
  await user.save()

  // custom returned results
  return user.id
}

const login = async (userInfo) => {
  const { username, password } = userInfo
  const user = await userModel.findOne(
    { username },
    { createdAt: 0, updatedAt: 0 }
  )

  if (!user) throw new MyError('username does not exist', 401)

  const isMatch = await bcrypt.compare(password, user.password)
  if (!isMatch) throw new MyError('password is wrong', 401)

  const payload = { id: user._id, role: user.role }
  const token = jwt.sign(payload, env.TOKEN_SECRET, { expiresIn: '30d' })
  // custom returned results
  // eslint-disable-next-line no-unused-vars
  const { password: removedPassword } = user.toObject()
  return token
}

const googleLogin = async (credential) => {
  const client = new OAuth2Client(env.GOOGLE_CLIENT_ID)
  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID
  })
  if (!ticket) throw new MyError('Lỗi xác thực, vui lòng thử lại', 401)

  const payload = ticket.getPayload()
  const { sub, email, name, picture } = payload
  let user = await userModel.findOne({ googleId: sub })

  if (!user) {
    user = new userModel({
      googleId: sub,
      email,
      name,
      picture
    })
    await user.save()
  }

  const token = jwt.sign({ id: user._id, role: user.role }, env.TOKEN_SECRET, {
    expiresIn: '30d'
  })

  return token
}

const authService = {
  login,
  register,
  googleLogin
}
export default authService
