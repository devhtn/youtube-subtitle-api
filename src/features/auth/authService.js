import bcrypt from 'bcrypt'
import { OAuth2Client } from 'google-auth-library'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'

import MyError from '~/utils/MyError'

import env from '~/config/env'
import userModel from '~/models/userModel'

const register = async (dataFields) => {
  const { username, password } = dataFields
  const isExist = await userModel.findOne({ username })
  if (isExist) throw new MyError('Tên đăng nhập đã tồn tại', 409)
  const hashedPassword = await bcrypt.hash(password, 10)
  dataFields.password = hashedPassword
  const user = new userModel()
  Object.assign(user, dataFields)
  await user.save()

  // custom returned results
  return user.id
}

const login = async (userInfo) => {
  const { username, password } = userInfo
  const user = await userModel.findOne({ username })

  if (!user) throw new MyError('Tên đăng nhập không tồn tại!', 401)

  const isMatch = await bcrypt.compare(password, user.password)
  if (!isMatch) throw new MyError('Sai mật khẩu', 401)

  // Kiểm tra nếu tài khoản bị khóa
  if (user.lock?.isLock) {
    const currentDate = new Date() // Lấy thời gian hiện tại
    const dateOpen = new Date(user.lock.dateOpen) // Chuyển đổi ngày mở khóa từ chuỗi thành Date object

    // Nếu thời gian hiện tại lớn hơn dateOpen (tức là tài khoản đã hết hạn bị khóa)
    if (currentDate > dateOpen) {
      // Mở khóa tài khoản, cập nhật lại trạng thái lock
      user.lock.isLock = false
      user.lock.dateOpen = null // Cập nhật lại ngày mở khóa (không còn bị khóa)
      user.lock.dateOpen = '' // Cập nhật lại ngày mở khóa (không còn bị khóa)
      await user.save() // Lưu thay đổi vào cơ sở dữ liệu
    } else {
      // Nếu tài khoản vẫn bị khóa, trả về thông tin khóa
      throw new MyError(user.lock, 403) // Trả về nguyên object lock
    }
  }

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

const updateInfo = async (dataFields, file, userId) => {
  if (file) dataFields.picture = file.path
  else delete dataFields.picture
  console.log(file)

  const allowedFields = ['password', 'name', 'picture']
  const filteredData = Object.keys(dataFields)
    .filter((key) => allowedFields.includes(key))
    .reduce((obj, key) => {
      obj[key] = dataFields[key]
      return obj
    }, {})
  if (Object.keys(filteredData).length === 0) {
    throw new MyError('No valid fields to update')
  }

  console.log(filteredData)

  const updatedUser = await userModel.findByIdAndUpdate(
    userId,
    { $set: filteredData },
    { new: true, runValidators: true }
  )

  if (!updatedUser) {
    throw new MyError('User not found')
  }

  return filteredData
}

const getUserStatistic = async () => {
  const result = await userModel.aggregate([
    // Thêm trường "monthYear" từ "createdAt"
    {
      $addFields: {
        monthYear: { $dateToString: { format: '%m-%Y', date: '$createdAt' } }
      }
    },
    // Nhóm theo "monthYear" để đếm số người dùng trong từng tháng
    {
      $group: {
        _id: '$monthYear',
        countUser: { $sum: 1 }
      }
    },
    // Định dạng lại dữ liệu
    {
      $project: {
        _id: 0,
        month: '$_id',
        countUser: 1
      }
    },
    // Sắp xếp theo tháng-năm
    { $sort: { month: 1 } }
  ])

  // Tính tổng số lượng người dùng trong toàn bộ cơ sở dữ liệu
  const totalUsers = result.reduce((total, item) => total + item.countUser, 0)

  return {
    statistic: result, // Thống kê theo tháng
    totalUsers // Tổng số lượng người dùng
  }
}

const getRankingUsers = async (userId) => {
  const result = await userModel.aggregate([
    // Lọc chỉ những user có role = 'user'
    {
      $match: {
        role: 'user'
      }
    },
    {
      $lookup: {
        from: 'dictations',
        localField: '_id',
        foreignField: 'userId',
        as: 'userDictations'
      }
    },
    {
      $addFields: {
        id: '$_id' // Tạo trường mới `id` sao chép từ `_id`
      }
    },
    {
      $lookup: {
        from: 'words',
        localField: '_id',
        foreignField: 'userId',
        as: 'userWords'
      }
    },
    {
      $project: {
        id: 1,
        name: 1,
        picture: 1,
        countExercise: {
          $size: {
            $filter: {
              input: '$userDictations',
              as: 'dictation',
              cond: { $eq: ['$$dictation.isCompleted', true] }
            }
          }
        },
        avgScore: {
          $cond: {
            if: {
              $gt: [
                {
                  $size: {
                    $filter: {
                      input: '$userDictations',
                      as: 'dictation',
                      cond: { $eq: ['$$dictation.isCompleted', true] }
                    }
                  }
                },
                0
              ]
            },
            then: {
              $divide: [
                {
                  $sum: {
                    $map: {
                      input: {
                        $filter: {
                          input: '$userDictations',
                          as: 'dictation',
                          cond: { $eq: ['$$dictation.isCompleted', true] }
                        }
                      },
                      as: 'completedDictation',
                      in: '$$completedDictation.score'
                    }
                  }
                },
                {
                  $size: {
                    $filter: {
                      input: '$userDictations',
                      as: 'dictation',
                      cond: { $eq: ['$$dictation.isCompleted', true] }
                    }
                  }
                }
              ]
            },
            else: 0
          }
        },
        accumulatedWord: {
          $size: {
            $filter: {
              input: '$userWords',
              as: 'word',
              cond: { $eq: ['$$word.expired', false] }
            }
          }
        }
      }
    },
    // Thêm trường sortKey để gộp các tiêu chí sắp xếp
    {
      $addFields: {
        sortKey: {
          $add: [
            { $multiply: ['$accumulatedWord', 1000000] }, // Ưu tiên từ vựng tích lũy
            '$avgScore' // Thêm điểm trung bình vào
          ]
        }
      }
    },
    // Sắp xếp và thêm thứ hạng
    {
      $setWindowFields: {
        sortBy: { sortKey: -1 }, // Sắp xếp theo sortKey
        output: {
          ranking: { $rank: {} } // Thêm cột xếp hạng
        }
      }
    },
    // Tách kết quả thành 2 phần: topUsers và targetUser
    {
      $facet: {
        topUsers: [{ $limit: 10 }], // Giới hạn danh sách top 10
        targetUser: [{ $match: { _id: new mongoose.Types.ObjectId(userId) } }] // Tìm thông tin của userId
      }
    }
  ])

  const topUsers = result[0]?.topUsers || []
  const targetUser = result[0]?.targetUser[0] || null

  return {
    topUsers,
    targetUser
  }
}

const lockUser = async (userId, lockDuration, reason) => {
  if (!lockDuration || !reason) {
    throw new MyError(
      'Vui lòng cung cấp thời gian khóa và lý do khóa tài khoản.'
    )
  }

  // Tìm user theo userId
  const user = await userModel.findById(userId)
  if (!user) {
    throw new MyError('Không tìm thấy người dùng.')
  }

  // Kiểm tra nếu tài khoản đã bị khóa
  if (user.lock?.isLock) {
    throw new MyError('Tài khoản đã bị khóa.')
  }

  // Tính toán thời gian mở khóa
  const lockDurationInMilliseconds = lockDuration * 24 * 60 * 60 * 1000 // Chuyển đổi số ngày thành milliseconds
  const dateOpen = new Date(Date.now() + lockDurationInMilliseconds) // Thời gian mở khóa

  // Cập nhật trạng thái khóa tài khoản
  user.lock = {
    isLock: true,
    dateOpen,
    reason
  }

  // Lưu thay đổi
  const updateUser = await user.save()
  return updateUser
}

const unlockUser = async (userId) => {
  // Tìm user theo userId
  const user = await userModel.findById(userId)
  if (!user) {
    throw new MyError('Không tìm thấy người dùng.')
  }

  // Kiểm tra nếu tài khoản chưa bị khóa
  if (!user.lock?.isLock) {
    throw new MyError('Tài khoản chưa bị khóa.')
  }

  // Mở khóa tài khoản ngay lập tức
  user.lock = {
    isLock: false,
    dateOpen: null, // Xóa thời gian mở khóa
    reason: '' // Xóa lý do khóa
  }

  // Lưu thay đổi
  const updateUser = await user.save()
  return updateUser
}

const authService = {
  unlockUser,
  lockUser,
  updateInfo,
  getRankingUsers,
  getUserStatistic,
  login,
  register,
  googleLogin
}
export default authService
