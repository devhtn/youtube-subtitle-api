import _ from 'lodash'

import MyError from '~/utils/MyError'

import wordService from '../word/wordService'
import exerciseUtil from './exerciseUtil'
import commentModel from '~/models/commentModel'
import dictationModel from '~/models/dictationModel'
import exerciseModel from '~/models/exerciseModel'
import wordListModel from '~/models/wordListModel'
import { filterQuery } from '~/utils'

const checkVideo = async (videoId) => {
  // Kiểm tra nếu đã tồn tại bài tập với videoId, trả về nếu có
  let existExercise = await exerciseModel
    .findOne({ videoId: videoId })
    .populate([{ path: 'firstUserId' }, { path: 'userId' }])
  if (existExercise) return existExercise

  // Lấy thông tin video từ `exerciseUtil`
  const videoInfo = await exerciseUtil.getInfoVideo(videoId)

  // Khởi tạo các Set để lưu trữ từ duy nhất và các biến đếm
  let lemmaWordsSet = new Set()
  let totalDictationWords = 0
  let totalTime = 0
  let totalWords = 0

  // Duyệt qua các segment để xử lý từng phần của video
  videoInfo.segments.forEach((segment) => {
    const { lemmatizedWords, dictationWords, lengthWords } =
      exerciseUtil.parseSub(segment.text)
    segment.dictationWords = dictationWords
    segment.lemmaSegmentWords = lemmatizedWords
    // Thêm các từ vào Set để loại bỏ phần tử trùng lặp
    lemmatizedWords.forEach((word) => lemmaWordsSet.add(word))
    totalDictationWords += dictationWords.length
    // Tính thời gian và số từ
    const duration = segment.end - segment.start
    if (duration > 0) {
      totalTime += duration
      totalWords += lengthWords
    }
  })

  // Tính tốc độ trung bình và số lượng từ duy nhất trong dictationWords
  videoInfo.avgSpeed =
    totalTime > 0 ? ((totalWords * 60) / totalTime).toFixed(0) : 0
  videoInfo.totalDictationWords = totalDictationWords
  videoInfo.lemmaWords = Array.from(lemmaWordsSet)

  // Tạo danh sách đối chiếu từ vựng với `wordLists`
  const oxfordList = await wordListModel.findOne({ name: 'Oxford 3000' })
  videoInfo.difficult =
    lemmaWordsSet.size -
    exerciseUtil.calcWordMatch(videoInfo.lemmaWords, oxfordList.words)
  const newVideoInfo = await exerciseUtil.addTransText(videoInfo)

  return newVideoInfo
}

const delDictation = async (dictationId) => {
  const dictation = await dictationModel.findById(dictationId)

  if (!dictation) {
    throw new MyError('Bài tập không tồn tại')
  }

  await dictationModel.findByIdAndDelete(dictationId)

  const exercise = await exerciseModel.findById(dictation.exerciseId)
  if (exercise && !exercise.isPublic) {
    await exerciseModel.findByIdAndDelete(exercise._id)
    await commentModel.deleteMany({ exerciseId: exercise._id })
  }

  return dictation
}

const createDictation = async (exerciseId, userId) => {
  // Kiểm tra có dictation đang dang dở không
  const inCompleted = await dictationModel.findOne({
    userId,
    isCompleted: false
  })

  if (inCompleted) {
    throw new MyError('Chỉ được thêm tối đa một bài tập mới!', 409)
  }

  // Kiểm tra exercise đã hoàn thành trước đó chưa
  const existingDictation = await dictationModel
    .findOne({
      exerciseId,
      userId
    })
    .lean()
  if (existingDictation)
    throw new MyError('Bài tập này đã được bạn hoàn thành', 410)

  // Tìm kiếm exercise theo exerciseId và lọc các validSegments
  const exercise = await exerciseModel.findById(exerciseId).lean()

  if (!exercise) {
    throw new MyError('Không tìm thấy bài tập với ID này', 404)
  }

  const dictationSegments = [] // Mảng để lưu các segment đã được ánh xạ
  let totalCompletedSegments = 0 // Biến để đếm số lượng segment hợp lệ

  // Duyệt qua từng segment và thực hiện cả hai thao tác
  for (const segment of exercise.segments) {
    // Thêm segmentId vào từng phần tử và lưu vào dictationSegments
    dictationSegments.push({
      ...segment,
      segmentId: segment._id // Thêm segmentId
    })

    // Kiểm tra điều kiện để đếm totalCompletedSegments
    if (segment.dictationWords.length > 0) {
      totalCompletedSegments++ // Tăng số lượng segment hợp lệ
    }
  }

  // Tạo dictation mới
  const newDictation = await dictationModel.create({
    userId,
    exerciseId: exercise._id,
    segments: dictationSegments,
    totalCompletedSegments // Sử dụng tổng số đã tính toán
  })
  return newDictation
}

const createExercise = async (videoInfo, user) => {
  // Kiểm tra xem người dùng có dictation chưa hoàn thành nào không
  const inCompletedDictation = await dictationModel.findOne({
    userId: user.id,
    isCompleted: false
  })

  if (inCompletedDictation) {
    throw new MyError('Bạn cần xóa đi bài tập hiện tại', 409)
  }

  // Tìm kiếm exercise dựa trên videoId
  let exercise = await exerciseModel
    .findOne({ videoId: videoInfo.videoId })
    .lean()

  // Tìm kiếm dictation cho exercise này và user hiện tại
  const dictation = exercise
    ? await dictationModel
        .findOne({
          exerciseId: exercise._id,
          userId: user.id
        })
        .lean()
    : null

  // Nếu đã có dictation, ném lỗi
  if (dictation) {
    throw new MyError('Bài tập này đã được bạn hoàn thành trước đó', 410)
  }

  // Nếu exercise không tồn tại, tạo exercise mới
  if (!exercise) {
    exercise = await exerciseModel.create({
      ...videoInfo,
      userId: user.id
    })
  }

  const dictationSegments = [] // Mảng để lưu các segment đã được ánh xạ
  let totalCompletedSegments = 0 // Biến để đếm số lượng segment hợp lệ

  // Duyệt qua từng segment và thực hiện cả hai thao tác
  for (const segment of exercise.segments) {
    // Thêm segmentId vào từng phần tử và lưu vào dictationSegments
    dictationSegments.push({
      ...segment,
      segmentId: segment._id // Thêm segmentId
    })

    // Kiểm tra điều kiện để đếm totalCompletedSegments
    if (segment.dictationWords.length > 0) {
      totalCompletedSegments++ // Tăng số lượng segment hợp lệ
    }
  }

  // Tạo dictation mới
  await dictationModel.create({
    userId: user.id,
    exerciseId: exercise._id,
    segments: dictationSegments,
    totalCompletedSegments // Sử dụng tổng số đã tính toán
  })

  return exercise
}

const getDictation = async (dictationId) => {
  // Kiểm tra nếu dictationId được cung cấp
  if (!dictationId) {
    throw new Error('dictationId is required')
  }

  // Tìm dictation dựa trên dictationId và populate exerciseId cùng userId
  const dictation = await dictationModel.findById(dictationId).populate({
    path: 'exerciseId',
    populate: [{ path: 'userId' }]
  })

  // Trả về dictation tìm thấy hoặc null nếu không tồn tại
  return dictation
}

const updateDictation = async (id, dataFields = {}) => {
  // Handle replay logic
  if (dataFields.replay !== undefined) {
    // Lấy dictation hiện tại để xử lý các trường hợp liên quan đến `segments`
    const dictation = await dictationModel.findById(id)

    if (!dictation) {
      throw new Error('Dictation không tồn tại.')
    }

    // Trường hợp replay là `false`
    if (Array.isArray(dataFields.replay)) {
      if (_.isEmpty(dataFields.replay))
        throw new MyError('Bạn chưa quên từ vựng nào!')
      // Cập nhật `isCompleted` thành `false` cho các index trong mảng
      dataFields.replay.forEach((el) => {
        if (dictation.segments[el]) {
          dictation.segments[el].isCompleted = false
        }
      })
      dictation.completedSegmentsCount =
        dictation.totalCompletedSegments - dataFields.replay.length
      dataFields.replay = true // Sửa đổi replay thành trường hợp lệ
    }
    await dictation.save()
  }

  // Tìm và cập nhật Dictation với các trường trong dataFields
  const updated = await dictationModel.findByIdAndUpdate(
    id, // ID của document cần cập nhật
    { $set: dataFields }, // Các trường và giá trị cần cập nhật
    { new: true, runValidators: true } // Trả về document đã cập nhật, kiểm tra validation trước khi cập nhật
  )

  return updated // Trả về Dictation đã được cập nhật
}

const updateDictationSegment = async (
  dictationId,
  segmentId,
  updateFields,
  userId
) => {
  // Tìm dictation cần update
  const dictation = await dictationModel.findById(dictationId).lean()

  let updateDictation = null

  const segment = dictation.segments.find(
    (segment) => segment.segmentId.toString() === segmentId.toString()
  )

  if (!segment) {
    throw new MyError('segmentId không tồn tại', 404)
  }

  if (updateFields.isCompleted !== undefined) segment.attemptsCount++

  const updateSegment = { ...segment, ...updateFields }

  updateDictation = await dictationModel.findOneAndUpdate(
    {
      _id: dictationId,
      'segments.segmentId': segmentId
    },
    {
      $set: {
        'segments.$': updateSegment // Cập nhật toàn bộ đối tượng segment
      },
      ...(!segment.isCompleted && updateFields.isCompleted
        ? { $inc: { completedSegmentsCount: 1 } }
        : {})
    },
    { new: true }
  )

  // Lấy danh sách lemmaWords của segment trả lời đúng
  let newLevelWords = []
  if (updateDictation && updateFields.isCompleted && !segment.isCompleted) {
    // Bước 1: Tìm exercise dựa trên exerciseId
    const exercise = await exerciseModel.findById(updateDictation.exerciseId)

    // Bước 2: Kiểm tra sự tồn tại của exercise
    if (!exercise) {
      throw new MyError('Không tìm thấy exercise với ID đã cho', 404)
    }

    // Bước 3: Tìm segment trong exercise.segments bằng segmentId
    const segment = exercise.segments.find(
      (seg) => seg._id.toString() === segmentId.toString()
    )

    // Bước 4: Kiểm tra sự tồn tại của segment
    if (!segment) {
      throw new MyError('Không tìm thấy segment với ID đã cho', 404)
    }

    // Bước 5: Lấy lemmaSegmentWords và cập nhật vào levelWords
    const lemmaSegmentWords = segment.lemmaSegmentWords

    newLevelWords = await wordService.addWords(lemmaSegmentWords, userId)
  }

  // update dictation khi hoàn thành tất cả segment
  if (
    updateFields.isCompleted &&
    updateDictation.completedSegmentsCount ===
      updateDictation.totalCompletedSegments
  ) {
    let isReplay = false
    // Xét trường hợp dictation hoàn thành ở dạng replay
    if (updateDictation.replay) {
      updateDictation.replay = false
      isReplay = true
    }
    // Trường hợp hoàn thành lần đầu tiên
    else {
      updateDictation.isCompleted = true
      // Tính điểm cho bài tập vừa hoàn thành
      let totalSegmentScore = 0
      updateDictation.segments.forEach((segment) => {
        const segmentScore = 1 / segment.attemptsCount
        totalSegmentScore += segmentScore
      })
      const dictationScore =
        totalSegmentScore / updateDictation.totalCompletedSegments
      updateDictation.score = Math.round(dictationScore * 100)
    }
    // Cập nhật newUpdate
    await updateDictation.save()

    // Cập nhật completedCount của exerciseModel
    if (updateDictation.isCompleted && !isReplay) {
      const exercise = await exerciseModel.findById(updateDictation.exerciseId)

      // Kiểm tra xem có người dùng nào đã hoàn thành hay chưa
      const updateFields = {
        $addToSet: { completedUsers: userId }
      }

      // Nếu danh sách completedUsers trống, thêm userId vào firstUserId
      if (exercise.completedUsers.length === 0) {
        updateFields.$set = { isPublic: true, firstUserId: userId }
      }

      await exerciseModel.findByIdAndUpdate(
        updateDictation.exerciseId,
        updateFields,
        { new: true }
      )
    }
  }

  return { updateDictation, newLevelWords }
}

const getUserDictations = async (userId, query = {}) => {
  // Lọc các query tùy chỉnh nếu có
  const filter = filterQuery(query)

  // handle playing
  if (filter.playing) {
    filter.$or = [{ isCompleted: false }, { replay: true }]
    delete filter.playing
  }

  // Lấy trang và giới hạn
  const page = parseInt(query.page, 10) || 1 // Trang hiện tại
  const limit = parseInt(query.limit, 10) || 2 // Số lượng bản ghi mỗi trang
  const skip = (page - 1) * limit // Số lượng bản ghi cần bỏ qua

  // Sử dụng skip và limit trong MongoDB
  const dictations = await dictationModel
    .find({ userId, ...filter })
    .skip(skip) // Bỏ qua các bản ghi trước đó
    .limit(limit) // Giới hạn số lượng bản ghi trả về
    .populate({
      path: 'exerciseId',
      populate: [{ path: 'userId' }, { path: 'firstUserId' }]
    })

  return dictations
}

const getExercises = async (query, userId) => {
  let filter = filterQuery(query)

  // FILTER
  // handle category
  if (Array.isArray(filter.category)) {
    filter.category = { $in: filter.category }
  }
  // handle duration
  exerciseUtil.handleRangeFilter(filter, 'duration')
  // handle difficult
  exerciseUtil.handleRangeFilter(filter, 'difficult')
  // handle interaction
  if (filter.interaction) {
    if (typeof filter.interaction === 'string') {
      filter.interaction = [filter.interaction]
    }
    const conditions = filter.interaction.map((property) => {
      return { [property]: userId } // Đúng cú pháp cho dynamic key
    })
    delete filter.interaction
    filter.$or = [...(filter.$or || []), ...conditions]
  }

  const page = parseInt(query.page, 10) || 1
  const limit = parseInt(query.limit, 10) || 2
  const skip = (page - 1) * limit

  // Đặt giá trị mặc định cho sort và order nếu không có trong query
  const sortField = query.sort || 'completedUsersCount' // Mặc định là completedUsersCount
  const sortOrder = query.order === 'asc' ? 1 : -1 // Nếu order là 'asc', sắp xếp tăng dần, ngược lại sắp xếp giảm dần

  // Lấy tổng danh sách
  const totalExercises = await exerciseModel.countDocuments({
    isPublic: true,
    ...filter
  })
  const totalPages = Math.ceil(totalExercises / limit)

  // Sử dụng aggregate để lấy danh sách exercises với số lượng người dùng đã hoàn thành
  const exercises = await exerciseModel.aggregate([
    {
      $match: { isPublic: true, ...filter } // Chỉ lấy bài tập công khai
    },
    {
      $addFields: {
        completedUsersCount: { $size: '$completedUsers' }, // Đếm số lượng người dùng đã hoàn thành
        id: '$_id'
      }
    },
    {
      $sort: { [sortField]: sortOrder, _id: 1 } // Sắp xếp theo số lượng người dùng đã hoàn thành
    },
    {
      $skip: skip // Phân trang
    },
    {
      $limit: limit // Giới hạn số lượng kết quả trả về
    },
    {
      $project: {
        segments: 0 // Loại bỏ trường segments
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'firstUserId',
        foreignField: '_id',
        as: 'firstUserId'
      }
    },
    {
      $unwind: {
        path: '$firstUserId',
        preserveNullAndEmptyArrays: true // Giữ lại bài tập nếu không tìm thấy người dùng
      }
    },
    {
      $addFields: {
        'firstUserId.id': '$firstUserId._id' // Thêm trường id cho firstUserId
      }
    }
  ])

  // Nhóm các bài tập theo category và đếm số lượng bài tập cho từng category

  return { exercises, totalPages }
}

const getCategories = async () => {
  const categories = await exerciseModel.aggregate([
    {
      $match: { isPublic: true } // Chỉ lấy bài tập công khai với bộ lọc
    },
    {
      $group: { _id: '$category' } // Nhóm theo category
    },
    {
      $sort: { _id: 1 } // Sắp xếp theo tên category (tùy chỉnh)
    },
    {
      $project: {
        _id: 0, // Loại bỏ _id gốc
        label: '$_id', // Gán giá trị _id vào label
        value: '$_id' // Gán giá trị _id vào value
      }
    }
  ])

  return categories
}

const getExercise = async (id) => {
  return await exerciseModel.findById(id)
}

// comment exercise

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

const toggleLikeExercise = async (exerciseId, user) => {
  // Tìm bài tập và kiểm tra tồn tại
  const exercise = await exerciseModel.findById(exerciseId)
  if (!exercise) {
    throw new Error('Exercise not found')
  }

  // Kiểm tra xem userId đã tồn tại trong likedUsers chưa
  const userIndex = exercise.likedUsers.indexOf(user.id)

  if (userIndex === -1) {
    // Nếu userId chưa có, thêm vào likedUsers và tăng lượt like
    exercise.likedUsers.push(user.id)
  } else {
    // Nếu userId đã có, xóa khỏi likedUsers và giảm lượt like
    exercise.likedUsers.splice(userIndex, 1)
  }

  // Lưu lại exercise sau khi cập nhật
  await exercise.save()

  return exercise.likedUsers
}

const exerciseService = {
  delDictation,
  getUserDictations,
  createDictation,
  toggleLikeExercise,
  getExerciseComments,
  getExercise,
  getExercises,
  updateDictationSegment,
  getDictation,
  checkVideo,
  createExercise,
  getCategories,
  updateDictation
}
export default exerciseService
