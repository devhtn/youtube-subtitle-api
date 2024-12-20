import fs from 'fs'

import _ from 'lodash'
import mongoose from 'mongoose'

import MyError from '~/utils/MyError'

import notifyService from '../notify/notifyService'
import wordService from '../word/wordService'
import exerciseUtil from './exerciseUtil'
import dictationModel from '~/models/dictationModel'
import exerciseModel from '~/models/exerciseModel'
import { notifyModel } from '~/models/notifyModel'
import userModel from '~/models/userModel'
import { filterQuery } from '~/utils'

const checkVideo = async (videoId, user) => {
  const TIMEOUT_DURATION = 100000 // 10 giây

  // Hàm timeout để thông báo người dùng nếu quá thời gian
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new MyError('Quá thời gian xử lý, vui lòng thử lại sau'))
    }, TIMEOUT_DURATION)
  })

  // Hàm chính của checkVideo
  const mainPromise = (async () => {
    // Kiểm tra nếu đã tồn tại bài tập với videoId, trả về nếu có
    let existExercise = await exerciseModel
      .findOne({ videoId: videoId })
      .populate([{ path: 'firstUserId' }, { path: 'userId' }])
    if (existExercise) return existExercise

    // Lấy thông tin video và kiểm tra tính phù hợp
    let videoInfo
    if (user.role === 'admin') {
      videoInfo = await exerciseUtil.getInfoVideo(videoId)
    } else {
      const level = await wordService.getLevel(user.id)
      videoInfo = await exerciseUtil.getInfoVideo(videoId, level)
    }

    const newVideoInfo = await exerciseUtil.addTransText(videoInfo)

    return newVideoInfo
  })()

  // Trả về Promise.race giữa mainPromise và timeoutPromise
  return Promise.race([mainPromise, timeoutPromise])
}

const delDictation = async (dictationId) => {
  const dictation = await dictationModel.findById(dictationId)

  if (!dictation) {
    throw new MyError('Bài tập không tồn tại')
  }

  await dictationModel.findByIdAndDelete(dictationId)

  const exercise = await exerciseModel.findById(dictation.exerciseId)
  if (exercise && exercise.state === 'private') {
    await exerciseModel.findByIdAndDelete(exercise._id)
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

  const level = await wordService.getLevel(userId)
  if (level < 1000 && exercise.duration > 240)
    throw new MyError(
      'Bạn cần đạt ít nhất cấp độ 1000 để làm bài tập trên 4 phút!'
    )

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

const createPublicExercise = async (videoInfo, userId) => {
  const isExist = await exerciseModel
    .findOne({ videoId: videoInfo.videoId })
    .lean()

  if (isExist) throw new MyError('Bài tập đã tồn tại trên hệ thống')

  const exercise = await exerciseModel.create({
    ...videoInfo,
    state: 'public',
    userId
  })
  return exercise
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
    throw new MyError('Bài tập này đã được bạn hoàn thành', 410)
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

const toggleLockExercise = async (exerciseId) => {
  const exercise = await exerciseModel.findById(exerciseId)

  if (!exercise) {
    throw new Error('Exercise not found')
  }

  const newState = exercise.state === 'public' ? 'hidden' : 'public'

  // Cập nhật giá trị mới và trả về kết quả đã cập nhật
  const updatedExercise = await exerciseModel.findByIdAndUpdate(
    exerciseId,
    { state: newState },
    { new: true, select: 'state' }
  )

  return updatedExercise.state
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
        const segmentScore =
          segment.attemptsCount > 0 ? 1 / segment.attemptsCount : 0
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
        updateFields.$set = { state: 'public', firstUserId: userId }
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

const getExercises = async (query, user) => {
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
    const userId = new mongoose.Types.ObjectId(user.id)
    if (typeof filter.interaction === 'string') {
      filter.interaction = [filter.interaction]
    }
    const conditions = filter.interaction.map((property) => {
      return { [property]: userId } // Đúng cú pháp cho dynamic key
    })
    delete filter.interaction
    filter.$or = [...(filter.$or || []), ...conditions]
  }

  // handle state
  // Handle state
  let defaultState = []
  if (user.role === 'user') {
    defaultState = ['public']
  } else {
    defaultState = ['public', 'hidden']
  }

  // Xử lý filter.state
  if (filter.state) {
    // Nếu filter.state là một chuỗi, chuyển thành mảng
    if (typeof filter.state === 'string') {
      filter.state = [filter.state] // Đảm bảo filter.state là mảng
    }
    // Áp dụng điều kiện $in
    filter.state = { $in: filter.state }
  } else {
    // Nếu không có filter.state, sử dụng defaultState
    filter.state = { $in: defaultState }
  }

  // handle creator
  if (filter.creator) {
    const roleCondition = { 'userId.role': filter.creator }
    delete filter.creator
    filter.$or = [...(filter.$or || []), roleCondition]
  }

  // SEARCH
  // Search Text
  const searchText = query.q?.trim() // Text tìm kiếm người dùng nhập
  const escapedSearchText = _.escapeRegExp(searchText)
  delete filter.q

  // Tìm kiếm theo title, category hoặc firstUser.name
  // Tạo điều kiện tìm kiếm cho title và category nếu có searchText
  let searchConditions = []
  if (searchText) {
    searchConditions = [
      { title: { $regex: escapedSearchText, $options: 'i' } }, // Tìm kiếm trong title
      { category: { $regex: escapedSearchText, $options: 'i' } }, // Tìm kiếm trong category
      { 'firstUserId.name': { $regex: escapedSearchText, $options: 'i' } } // Tìm kiếm theo name của firstUserId
    ]
  }
  // Bây giờ, chúng ta tạo điều kiện $and kết hợp cả tìm kiếm theo searchText và các filter còn lại
  const combinedFilter = {
    $and: [
      ...(searchConditions.length > 0 ? [{ $or: searchConditions }] : []), // Nếu có searchText, tìm kiếm theo title hoặc category
      { ...filter } // Kết hợp với filter còn lại (duration, interaction, ...etc)
    ]
  }

  const page = parseInt(query.page, 10) || 1
  const limit = parseInt(query.limit, 10) || 12
  const skip = (page - 1) * limit

  // Đặt giá trị mặc định cho sort và order nếu không có trong query
  const sortField = query.sort || 'completedUsersCount' // Mặc định là completedUsersCount
  const sortOrder = query.order === 'asc' ? 1 : -1 // Nếu order là 'asc', sắp xếp tăng dần, ngược lại sắp xếp giảm dần

  // Lấy tổng danh sách

  const totalExercisesResult = await exerciseModel.aggregate([
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
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'userId'
      }
    },
    {
      $unwind: {
        path: '$userId',
        preserveNullAndEmptyArrays: true
      }
    },
    { $match: combinedFilter },
    { $count: 'totalCount' }
  ])

  const totalExercises =
    totalExercisesResult.length > 0 ? totalExercisesResult[0].totalCount : 0
  const totalPages = Math.ceil(totalExercises / limit)

  // Sử dụng aggregate để lấy danh sách exercises với số lượng người dùng đã hoàn thành
  const exercises = await exerciseModel.aggregate([
    //
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
        firstUserName: { $ifNull: ['$firstUserId.name', ''] } // Nếu firstUserId.name không tồn tại, trả về chuỗi rỗng
      }
    },
    // Lookup the userId and add role to filter by it
    {
      $lookup: {
        from: 'users',
        localField: 'userId', // Assuming 'userId' is the reference field for the user
        foreignField: '_id',
        as: 'userId'
      }
    },
    {
      $unwind: {
        path: '$userId',
        preserveNullAndEmptyArrays: true // Preserve if userId not found
      }
    },

    //
    {
      $match: combinedFilter // Áp dụng bộ lọc và điều kiện tìm kiếm sau khi lookup
    },
    {
      $addFields: {
        completedUsersCount: { $size: '$completedUsers' },
        likedUsersCount: { $size: '$likedUsers' },
        dislikedUsersCount: { $size: '$dislikedUsers' },
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
      $addFields: {
        'firstUserId.id': '$firstUserId._id' // Thêm trường id cho firstUserId
      }
    }
  ])

  return { exercises, totalPages, totalExercises }
}

const getCategories = async () => {
  const categories = await exerciseModel.aggregate([
    {
      $match: { state: 'public' } // Chỉ lấy bài tập công khai với bộ lọc
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

const toggleLikeExercise = async (exerciseId, user) => {
  // Tìm bài tập và kiểm tra tồn tại
  const exercise = await exerciseModel.findById(exerciseId)
  if (!exercise) {
    throw new Error('Exercise not found')
  }

  // Kiểm tra xem userId đã tồn tại trong dislikedUsers chưa
  const isInDislikedUsers = exercise.dislikedUsers.includes(user.id)
  if (isInDislikedUsers) {
    throw new Error('Bạn không thể vừa thích và không thích bài tập này')
  }

  // Kiểm tra xem userId đã tồn tại trong likedUsers chưa
  const userIndex = exercise.likedUsers.indexOf(user.id)

  if (userIndex === -1) {
    // Nếu userId chưa có, thêm vào likedUsers
    exercise.likedUsers.push(user.id)
  } else {
    // Nếu userId đã có, xóa khỏi likedUsers
    exercise.likedUsers.splice(userIndex, 1)
  }

  // Lưu lại exercise sau khi cập nhật
  await exercise.save()

  return exercise.likedUsers
}

const toggleDislikeExercise = async (exerciseId, user) => {
  // Tìm bài tập và kiểm tra tồn tại
  const exercise = await exerciseModel.findById(exerciseId)
  if (!exercise) {
    throw new Error('Exercise not found')
  }

  // Kiểm tra xem userId đã tồn tại trong likedUsers chưa
  const isInLikedUsers = exercise.likedUsers.includes(user.id)
  if (isInLikedUsers) {
    throw new Error('Bạn không thể vừa thích và không thích bài tập này')
  }

  // Kiểm tra xem userId đã tồn tại trong dislikedUsers chưa
  const userIndex = exercise.dislikedUsers.indexOf(user.id)

  if (userIndex === -1) {
    // Nếu userId chưa có, thêm vào dislikedUsers
    exercise.dislikedUsers.push(user.id)
  } else {
    // Nếu userId đã có, xóa khỏi dislikedUsers
    exercise.dislikedUsers.splice(userIndex, 1)
  }

  // Gửi thông báo đến admin có người report video
  if (exercise.dislikedUsers.length > 0) {
    const adminUser = await userModel.findOne({ role: 'admin' })

    if (adminUser) {
      // Check if a notification already exists for this exerciseId (relatedId)
      const existingNotify = await notifyModel.findOne({
        relatedId: exerciseId,
        userId: adminUser.id
      })

      // If no notification exists, create a new one
      if (!existingNotify) {
        await notifyService.createNotifyExercise(adminUser.id, exercise)
      }
    }
  }

  // Lưu lại exercise sau khi cập nhật
  await exercise.save()

  return exercise.dislikedUsers
}

const getExerciseStatistic = async () => {
  // 1. Tính toán thống kê theo tháng và lấy thông tin role
  const result = await exerciseModel.aggregate([
    // Thêm trường "monthYear" từ "createdAt"
    {
      $addFields: {
        monthYear: { $dateToString: { format: '%m-%Y', date: '$createdAt' } }
      }
    },
    // Lookup để lấy thông tin role của người tạo bài tập từ User collection
    {
      $lookup: {
        from: 'users', // Collection chứa thông tin user
        localField: 'userId', // userId từ exerciseModel
        foreignField: '_id', // _id trong users
        as: 'userInfo' // Kết quả lookup sẽ được lưu vào "userInfo"
      }
    },
    // Giải nén mảng userInfo (mỗi bài tập chỉ có 1 người tạo)
    {
      $unwind: '$userInfo'
    },
    // Nhóm theo "monthYear" và phân loại theo role
    {
      $group: {
        _id: '$monthYear',
        countExercise: { $sum: 1 },
        countAdminExercise: {
          $sum: { $cond: [{ $eq: ['$userInfo.role', 'admin'] }, 1, 0] }
        },
        countUserExercise: {
          $sum: { $cond: [{ $eq: ['$userInfo.role', 'user'] }, 1, 0] }
        },
        countCompletedExercises: {
          $sum: { $cond: [{ $gt: [{ $size: '$completedUsers' }, 0] }, 1, 0] }
        },
        totalCompletionCount: { $sum: { $size: '$completedUsers' } }
      }
    },
    // Định dạng lại kết quả
    {
      $project: {
        _id: 0,
        month: '$_id',
        countExercise: 1,
        countAdminExercise: 1,
        countUserExercise: 1,
        countCompletedExercises: 1,
        totalCompletionCount: 1
      }
    },
    // Sắp xếp theo tháng-năm
    { $sort: { month: 1 } }
  ])

  // 2. Tính tổng số lượng bài tập từ tất cả các tháng
  const totalExercises = result.reduce(
    (total, item) => total + item.countExercise,
    0
  )

  // 3. Tính tổng số bài tập do admin và user tạo
  const totalAdminExercises = result.reduce(
    (total, item) => total + item.countAdminExercise,
    0
  )

  const totalUserExercises = result.reduce(
    (total, item) => total + item.countUserExercise,
    0
  )

  // 4. Tính tổng số bài tập đã hoàn thành và tổng số lượt hoàn thành
  const totalCompletedExercises = result.reduce(
    (total, item) => total + item.countCompletedExercises,
    0
  )

  const totalCompletionCount = result.reduce(
    (total, item) => total + item.totalCompletionCount,
    0
  )

  return {
    statistic: result, // Thống kê bài tập theo tháng
    totalExercises, // Tổng số lượng bài tập
    totalAdminExercises, // Tổng bài tập do admin tạo
    totalUserExercises, // Tổng bài tập do người dùng tạo
    totalCompletedExercises, // Tổng số bài tập đã hoàn thành
    totalCompletionCount // Tổng số lượt hoàn thành bài tập
  }
}

const exerciseService = {
  createPublicExercise,
  getExerciseStatistic,
  delDictation,
  getUserDictations,
  createDictation,
  toggleLikeExercise,
  toggleDislikeExercise,
  getExercise,
  getExercises,
  updateDictationSegment,
  getDictation,
  checkVideo,
  createExercise,
  getCategories,
  updateDictation,
  toggleLockExercise
}
export default exerciseService
