import notifyService from '../notify/notifyService'
import commentModel from '~/models/commentModel'
import exerciseModel from '~/models/exerciseModel'
import userModel from '~/models/userModel'

const getExerciseComments = async (exerciseId) => {
  return await commentModel
    .find({ exerciseId, parentId: null })
    .sort({ createdAt: -1 })
    .populate('userId', 'name picture role') // Populate để lấy thông tin người dùng cho comment gốc
    .populate({
      path: 'replies',
      populate: [
        { path: 'userId', select: 'name picture role' }, // Populate thông tin người dùng trong replies
        { path: 'mentionUserId', select: 'name' } // Populate thông tin người dùng cho mentionUserId
      ]
    })
    .exec()
}

const toggleLikeComment = async (commentId, userId) => {
  // Tìm và cập nhật comment
  const comment = await commentModel.findById(commentId)
  if (!comment) throw new Error('Comment not found')

  // Kiểm tra xem user đã like comment này chưa
  const hasLiked = comment.likes.includes(userId)

  // Thêm hoặc bỏ like
  if (hasLiked) {
    comment.likes.pull(userId) // Bỏ like
  } else {
    comment.likes.push(userId) // Thêm like
  }

  await comment.save()

  // Lấy lại comment đã cập nhật và populate các dữ liệu cần thiết
  const updatedComment = await commentModel
    .findById(commentId)
    .populate('userId', 'name picture role')
    .populate({
      path: 'replies',
      populate: [
        { path: 'userId', select: 'name picture role' },
        { path: 'mentionUserId', select: 'name' }
      ]
    })
    .populate('mentionUserId', 'name')

  return updatedComment
}

const createComment = async (
  exerciseId,
  user,
  content,
  parentId,
  notifyAdmin = false
) => {
  let mentionUserId = null
  let newParentId = parentId

  if (parentId) {
    // Tìm comment cha để lấy parentId
    const parent = await commentModel.findById(parentId)
    if (parent && parent.parentId !== null) {
      newParentId = parent.parentId // Cập nhật newParentId
      mentionUserId = parent.userId // Gán mentionUserId
    }
  }

  // Tạo comment mới
  const newComment = await commentModel.create({
    exerciseId,
    userId: user._id,
    content,
    parentId: newParentId, // Lưu trữ parentId gốc cho comment mới
    mentionUserId // Đưa mentionUserId vào
  })

  if (newComment) {
    await exerciseModel.findByIdAndUpdate(exerciseId, {
      $addToSet: { commentedUsers: user._id }, // Chỉ thêm nếu user chưa tồn tại
      $inc: { commentedCount: 1 }
    })
  }
  // Nếu comment có parentId, thêm vào mảng replies của comment cha
  if (newParentId) {
    await commentModel.findByIdAndUpdate(newParentId, {
      $push: { replies: { $each: [newComment._id], $position: 0 } }
    })
  }

  // Tìm lại comment vừa tạo và populate dữ liệu cần thiết
  const savedComment = await commentModel
    .findById(newComment._id)
    .populate('userId', 'name picture') // Populate thông tin người dùng cho comment gốc
    .populate({
      path: 'replies',
      populate: [
        { path: 'userId', select: 'name picture' }, // Populate thông tin người dùng trong replies
        { path: 'mentionUserId', select: 'name' } // Populate thông tin người dùng cho mentionUserId
      ] // Populate thông tin người dùng trong replies
    })
    .populate('mentionUserId', 'name') // Populate thông tin người dùng được đề cập

  // Tích hợp notification
  if (parentId) {
    const parentComment = await commentModel.findById(parentId)
    const recipientUser = await userModel.findById(parentComment.userId)
    const senderUser = user // Người gửi là người tạo comment
    if (recipientUser) {
      // Sử dụng notificationService để gửi thông báo
      await notifyService.notifyComment(
        recipientUser.id,
        senderUser.name,
        savedComment
      )
    }
  } else if (notifyAdmin) {
    const senderUser = user
    const admin = await userModel.findOne({ role: 'admin' })
    await notifyService.notifyComment(
      admin.id,
      senderUser.name,
      savedComment,
      notifyAdmin
    )
  }

  return savedComment
}

const commentService = {
  toggleLikeComment,
  getExerciseComments,
  createComment
}

export default commentService
