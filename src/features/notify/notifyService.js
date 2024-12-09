import mongoose from 'mongoose'

import MyError from '~/utils/MyError'

import { notifyModel } from '~/models/notifyModel'
import { sendMessageToUser } from '~/socket'

// Import userSocketMap từ file socket

const notifyComment = async (
  recipientUserId,
  senderUser,
  newComment,
  notifyAdmin = false
) => {
  // Tạo thông báo mới trong cơ sở dữ liệu
  const newNotify = await notifyModel.create({
    userId: recipientUserId,
    message: notifyAdmin
      ? `${senderUser} đã nhắc đến bạn trong một bình luận`
      : `${senderUser} đã trả lời bình luận của bạn`,
    type: 'Comment',
    relatedId: newComment._id
  })
  newNotify.relatedId = newComment

  sendMessageToUser(recipientUserId, 'comment', newNotify)

  return newNotify
}

const createNotifyExercise = async (recipientUserId, exercise) => {
  const newNotify = await notifyModel.create({
    userId: recipientUserId,
    message: `Có một video đang bị cộng đồng report`,
    type: 'Exercise',
    relatedId: exercise.id
  })
  newNotify.relatedId = exercise

  sendMessageToUser(recipientUserId, 'exercise', newNotify)

  return newNotify
}

const getUserNotifies = async (userId) => {
  const notifies = await notifyModel
    .find({ userId })
    .sort({ createdAt: -1 }) // -1 là sắp xếp giảm dần (mới nhất trước)
    .populate({
      path: 'relatedId', // Populate trường relatedId
      populate: {
        path: 'userId', // Tiếp tục populate trường userId bên trong relatedId
        model: 'User' // Tên model của userId (nếu cần)
      }
    })
  return notifies
}
const updateNotify = async (id, dataFields) => {
  const updatedNotify = await notifyModel.findByIdAndUpdate(
    id,
    { $set: dataFields }, // Cập nhật các trường trong dataFields
    { new: true, runValidators: true } // Trả về bản ghi mới và áp dụng các trình xác thực
  )

  // Kiểm tra nếu thông báo không tồn tại
  if (!updatedNotify) {
    throw new MyError('Không tìm thấy thông báo.')
  }

  return updatedNotify
}

const deleteNotify = async (id) => {
  const result = await notifyModel.findByIdAndDelete(id)
  if (!result) throw new MyError('Thông báo không tồn tại!')
  return result
}

const notifyService = {
  deleteNotify,
  notifyComment,
  getUserNotifies,
  updateNotify,
  createNotifyExercise
}

export default notifyService
