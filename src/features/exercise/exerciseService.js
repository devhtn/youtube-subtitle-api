import translate from '@vitalets/google-translate-api'

import MyError from '~/utils/MyError'

import exerciseUtil from './exerciseUtil'
import env from '~/config/env'
import commentModel from '~/models/commentModel'
import dictationModel from '~/models/dictationModel'
import exerciseModel from '~/models/exerciseModel'
import userModel from '~/models/userModel'
import wordListModel from '~/models/wordListModel'

const checkVideo = async (videoId) => {
  const videoWords = []
  let existExercise = await exerciseModel
    .findOne({
      videoId: videoId
    })
    .populate([
      { path: 'shareUserId' }, // Populate shareUserId trong exercise
      { path: 'userId' } // Populate userId trong exercise
    ])
  if (existExercise) return existExercise
  const videoInfo = await exerciseUtil.getInfoVideo(videoId)

  let totalDictationWords = 0
  let totalTime = 0
  let totalWords = 0
  videoInfo.segments.forEach((el) => {
    const { lemmatizedWords, dictationWords, lengthWords } =
      exerciseUtil.parseSub(el.text)
    el.dictationWords = dictationWords
    totalDictationWords += dictationWords.length
    videoWords.push(...lemmatizedWords)
    const duration = el.end - el.start
    if (duration > 0) {
      totalTime += duration
      totalWords += lengthWords
    }
  })
  videoInfo.avgSpeed = ((totalWords * 60) / totalTime).toFixed(0)
  videoInfo.totalDictationWords = totalDictationWords

  const uniqWords = Array.from(new Set(videoWords))
  videoInfo.totalDictationUniqWords = uniqWords.length

  const wordLists = await wordListModel.find({})
  const checkList = wordLists.map((el) => {
    return {
      name: el.name,
      desc: el.desc,
      match: exerciseUtil.calcWordMatch(uniqWords, el.words)
    }
  })
  videoInfo.checkList = checkList
  return videoInfo
}

const getUserDictations = async (user, query = {}) => {
  const condition = { userId: user.id }
  if (query.isCompleted !== undefined) condition.isCompleted = query.isCompleted
  // Lấy danh sách dictation của người dùng
  const dictations = await dictationModel.find(condition).populate({
    path: 'exerciseId',
    populate: [
      { path: 'shareUserId' }, // Populate shareUserId bên trong exerciseId
      { path: 'userId' } // Populate userId ngang cấp với shareUserId bên trong exerciseId
    ]
  })
  return dictations
}

const createDictation = async (exerciseId, user) => {
  // Kiểm tra có dictation đang dang dở không
  const inCompleted = await dictationModel.findOne({
    userId: user.id,
    isCompleted: false
  })

  if (inCompleted) {
    throw new MyError('Bạn cần xóa đi exercise đang làm', 409)
  }

  // Kiểm tra exercise đã hoàn thành trước đó chưa
  const dictation = await dictationModel
    .findOne({
      exerciseId,
      userId: user.id
    })
    .lean()
  if (dictation)
    throw new MyError('Exercise đã được bạn hoàn tất trước đó', 410)

  // Tạo dictation mới
  const newDictation = new dictationModel({
    userId: user.id,
    exerciseId
  })

  await newDictation.save()
  return newDictation
}

const createExercise = async (videoInfo, user) => {
  const inCompletedDictation = await dictationModel.findOne({
    userId: user.id,
    isCompleted: false
  })
  if (inCompletedDictation)
    throw new MyError('Bạn ', 409)
  // Tìm kiếm exercise dựa trên videoId
  let exercise = await exerciseModel
    .findOne({ videoId: videoInfo.videoId })
    .lean()

  if (exercise) {
    // Tìm kiếm dictation cho exercise này và user hiện tại
    const dictation = await dictationModel
      .findOne({
        exerciseId: exercise._id,
        userId: user.id
      })
      .lean()

    // Nếu có dictation, trả về videoId của exercise
    if (dictation)
      throw new MyError('Exercise này đã được bạn hoàn thành trước đó', 410)

    await dictationModel.create({
      userId: user.id,
      exerciseId: exercise._id,
      totalSegments: exercise.segments.length
    })
  } else {
    // Nếu exercise chưa tồn tại, tạo exercise mới
    const newVideoInfo = await exerciseUtil.addTransText(videoInfo)
    exercise = await exerciseModel.create({
      ...newVideoInfo,
      userId: user.id
    })

    await dictationModel.create({
      userId: user.id,
      exerciseId: exercise._id,
      totalSegments: exercise.segments.length
    })
  }

  return exercise
}

const createPublicExercise = async (info, user) => {
  let exercise = await exerciseModel.findOne({
    videoId: info.videoId
  })
  if (exercise) {
    if (exercise.isPublic) throw new Error('Video đã được public trước đó')
    else {
      exercise.isPublic = true
      await exercise.save()
    }
  } else {
    info.userId = user.id
    info.isPublic = true
    exercise = await exerciseModel.create(info)
  }

  return exercise.videoId
}

const getDictation = async (videoId, userId) => {
  const exercise = await exerciseModel.findOne({ videoId })
  if (!exercise) throw new MyError('Exercise không tồn tại')
  return await dictationModel.findOne({ exerciseId: exercise.id, userId })
}

const updateDictation = async (dictationId, segmentId, updateFields) => {
  // Tìm dictation chứa segmentId
  const dictation = await dictationModel.findOne({
    _id: dictationId,
    'segments.segmentId': segmentId
  })

  let newUpdate = {}

  if (dictation) {
    // Nếu segmentId đã tồn tại trong dictation, tìm segment tương ứng
    const segment = dictation.segments.find(
      (segment) => segment.segmentId.toString() === segmentId.toString()
    )
    const newSegment = Object.assign(segment, updateFields)

    // Cập nhật các trường trong segment (isCompleted, note,...)
    const update = await dictationModel.findOneAndUpdate(
      {
        _id: dictationId,
        'segments.segmentId': segmentId
      },
      {
        $set: {
          'segments.$': newSegment // Cập nhật toàn bộ đối tượng segment
        },
        ...(!segment.isCompleted && updateFields.isCompleted
          ? { $inc: { completedSegmentsCount: 1 } }
          : {})
      },
      { new: true, runValidators: true }
    )

    // Cập nhật biến newUpdate với kết quả mới
    newUpdate = update
  } else {
    // Nếu segmentId chưa tồn tại, thêm segment mới với các trường cần thiết
    const update = await dictationModel.findOneAndUpdate(
      {
        _id: dictationId,
        'segments.segmentId': { $ne: segmentId }
      },
      {
        $push: {
          segments: { segmentId, ...updateFields }
        },
        ...(updateFields.isCompleted
          ? { $inc: { completedSegmentsCount: 1 } }
          : {})
      },
      { new: true, runValidators: true }
    )

    if (!update) throw new MyError('Update không thành công')
    newUpdate = update
  }

  // Kiểm tra nếu completedSegmentsCount bằng với totalSegments, cập nhật isCompleted
  if (
    updateFields.isCompleted &&
    newUpdate.completedSegmentsCount === newUpdate.totalSegments
  ) {
    await dictationModel.findByIdAndUpdate(dictationId, {
      $set: { isCompleted: true }
    })
  }

  return newUpdate
}

const getExercises = async () => {
  return await exerciseModel
    .find({ isPublic: true })
    .select('-segments') // Loại bỏ trường
    .populate('userId', 'name picture') // Thay 'name' và 'avatar' bằng các trường bạn muốn lấy từ User
    .exec() // Thực thi truy vấn
}

const getExercise = async (videoId) => {
  return await exerciseModel.findOne({ videoId })
}

// comment exercise
const createComment = async (exerciseId, userId, content, parentId) => {
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
    userId,
    content,
    parentId: newParentId, // Lưu trữ parentId gốc cho comment mới
    mentionUserId // Đưa mentionUserId vào
  })

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

  return savedComment
}

const getExerciseComments = async (exerciseId) => {
  return await commentModel
    .find({ exerciseId, parentId: null })
    .sort({ createdAt: -1 })
    .populate('userId', 'name picture') // Populate để lấy thông tin người dùng cho comment gốc
    .populate({
      path: 'replies',
      populate: [
        { path: 'userId', select: 'name picture' }, // Populate thông tin người dùng trong replies
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
    .populate('userId', 'name picture')
    .populate({
      path: 'replies',
      populate: [
        { path: 'userId', select: 'name picture' },
        { path: 'mentionUserId', select: 'name' }
      ]
    })
    .populate('mentionUserId', 'name')

  return updatedComment
}

const toggleLikeList = async (exerciseId, user) => {
  const index = user.likeList.indexOf(exerciseId)

  // Tìm bài tập và kiểm tra tồn tại
  const exercise = await exerciseModel.findById(exerciseId)
  if (!exercise) {
    throw new Error('Exercise not found')
  }

  if (index === -1) {
    // Nếu exerciseId chưa có, thêm vào likeList và tăng lượt like
    user.likeList.push(exerciseId)
    exercise.likesCount = (exercise.likesCount || 0) + 1
  } else {
    // Nếu exerciseId đã có, xóa khỏi likeList và giảm lượt like
    user.likeList.splice(index, 1)
    exercise.likesCount = Math.max((exercise.likesCount || 1) - 1, 0)
  }

  // Lưu lại user và exercise sau khi cập nhật
  await user.save()
  await exercise.save()

  return user
}

const exerciseService = {
  getUserDictations,
  createDictation,
  toggleLikeList,
  toggleLikeComment,
  getExerciseComments,
  createComment,
  getExercise,
  getExercises,
  createPublicExercise,
  updateDictation,
  getDictation,
  checkVideo,
  createExercise
}
export default exerciseService
