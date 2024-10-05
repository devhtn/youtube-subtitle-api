import MyError from '~/utils/MyError'

import exerciseUtil from './exerciseUtil'
import dictationModel from '~/models/dictationModel'
import exerciseModel from '~/models/exerciseModel'
import wordListModel from '~/models/wordListModel'

const checkVideo = async (videoId) => {
  const videoWords = []
  let existExercise = await exerciseModel.findOne({
    videoId: videoId
  })
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

const createExercise = async (info, user) => {
  // Tìm kiếm exercise dựa trên videoId
  let exercise = await exerciseModel.findOne({ videoId: info.videoId }).lean()

  if (exercise) {
    // Tìm kiếm dictation cho exercise này và user hiện tại
    const dictation = await dictationModel
      .findOne({
        exerciseId: exercise._id,
        userId: user.id
      })
      .lean()

    // Nếu chưa có dictation, trả về videoId của exercise
    if (dictation) return exercise.videoId

    // Nếu dictation chưa tồn tại, tạo dictation mới với danh sách segmentIds

    await dictationModel.create({
      userId: user.id,
      exerciseId: exercise._id
    })
  } else {
    // Nếu exercise chưa tồn tại, tạo exercise mới
    const newExercise = await exerciseModel.create({
      ...info,
      userId: user.id
    })

    await dictationModel.create({
      userId: user.id,
      exerciseId: newExercise._id
    })
  }

  return exercise.videoId
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
        }, // Cập nhật các trường được truyền vào
        ...(!segment.isCompleted && updateFields.isCompleted
          ? { $inc: { totalCompletedSegments: 1 } }
          : {})
      },
      { new: true, runValidators: true }
    )
    return update
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
          ? { $inc: { totalCompletedSegments: 1 } }
          : {})
      },
      { new: true, runValidators: true }
    )

    if (!update) throw new MyError('Update không thành công')

    return update
  }
}

const getAllExercises = async () => {
  const exercises = await exerciseModel
    .find()
    .select('-segments') // Loại bỏ trường
    .populate('userId', 'name picture') // Thay 'name' và 'avatar' bằng các trường bạn muốn lấy từ User
    .exec() // Thực thi truy vấn
  return exercises
}

const getExercise = async (videoId) => {
  const exercise = await exerciseModel.findOne({ videoId })
  return exercise
}

const exerciseService = {
  getExercise,
  getAllExercises,
  createPublicExercise,
  updateDictation,
  getDictation,
  checkVideo,
  createExercise
}
export default exerciseService
