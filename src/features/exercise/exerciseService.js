import _ from 'lodash'

import MyError from '~/utils/MyError'

import exerciseUtil from './exerciseUtil'
import commentModel from '~/models/commentModel'
import dictationModel from '~/models/dictationModel'
import exerciseModel from '~/models/exerciseModel'
import userModel from '~/models/userModel'
import wordListModel from '~/models/wordListModel'

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
  const wordLists = await wordListModel.find({})
  videoInfo.checkList = wordLists.map((list) => ({
    name: list.name,
    desc: list.desc,
    match: exerciseUtil.calcWordMatch(videoInfo.lemmaWords, list.words)
  }))
  const newVideoInfo = await exerciseUtil.addTransText(videoInfo)

  return newVideoInfo
}

const createDictation = async (exerciseId, user) => {
  // Kiểm tra có dictation đang dang dở không
  const inCompleted = await dictationModel.findOne({
    userId: user.id,
    isCompleted: false
  })

  if (inCompleted) {
    throw new MyError('Bạn có bài tập chưa hoàn thành!', 409)
  }

  // Kiểm tra exercise đã hoàn thành trước đó chưa
  const existingDictation = await dictationModel
    .findOne({
      exerciseId,
      userId: user.id
    })
    .lean()
  if (existingDictation)
    throw new MyError('Bài tập này đã được bạn hoàn thành', 410)

  // Tìm kiếm exercise theo exerciseId và lọc các validSegments
  const exercise = await exerciseModel.findById(exerciseId).lean()

  if (!exercise) {
    throw new MyError('Không tìm thấy bài tập với ID này', 404)
  }
  // Lọc các segments có dictationWords hợp lệ
  const validSegments = exercise.segments.filter(
    (segment) => segment.dictationWords.length > 0
  )

  // Tạo dictation mới
  const newDictation = new dictationModel({
    userId: user.id,
    exerciseId,
    segments: validSegments
  })

  await newDictation.save()
  return newDictation
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
    totalCompletedSegments: totalCompletedSegments // Sử dụng tổng số đã tính toán
  })

  return exercise
}

const adminCreateExercise = async (videoInfo, user) => {
  let exercise = await exerciseModel.findOne({
    videoId: videoInfo.videoId
  })
  if (exercise) {
    if (exercise.isPublic) throw new Error('Exercise đã được public trước đó')
    else {
      exercise.isPublic = true
      await exercise.save()
    }
  } else {
    // Nếu category chưa tồn tại, tạo category mới
    exercise = await exerciseModel.create({
      ...videoInfo,
      isPublic: true,
      userId: user.id
    })
  }

  return exercise
}

const getDictation = async (videoId, userId) => {
  const exercise = await exerciseModel.findOne({ videoId })
  if (!exercise) throw new MyError('Bài tập không tồn tại')
  return await dictationModel.findOne({ exerciseId: exercise.id, userId })
}

const getUserDictations = async (user, query = {}) => {
  const condition = { userId: user.id }
  if (query.isCompleted !== undefined) condition.isCompleted = query.isCompleted
  // Lấy danh sách dictation của người dùng
  const dictations = await dictationModel.find(condition).populate({
    path: 'exerciseId',
    populate: [{ path: 'userId' }]
  })

  return dictations
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
    newLevelWords = segment.lemmaSegmentWords

    await userModel.updateOne(
      { userId },
      { $addToSet: { levelWords: { $each: newLevelWords } } } // Thêm từng từ trong newLevelWords vào levelWords
    )
  }

  if (
    updateFields.isCompleted &&
    updateDictation.completedSegmentsCount ===
      updateDictation.totalCompletedSegments
  ) {
    updateDictation = await dictationModel.findByIdAndUpdate(
      dictationId,
      {
        $set: { isCompleted: true }
      },
      { new: true }
    )
    // Nếu newUpdate.isCompleted là true, cập nhật completedCount của exerciseModel
    if (updateDictation.isCompleted) {
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

const getUserList = async (userId) => {
  const user = await userModel
    .findById(userId)
    .populate('completedList') // Điền chi tiết thông tin bài tập đã hoàn thành
    .populate('likedList') // Điền chi tiết thông tin bài tập đã thích
    .populate('commentedList') // Điền chi tiết thông tin bài tập đã bình luận

  return user
}

const getExercises = async (query) => {
  // Đếm tổng số exercise công khai
  const filter = _.omit(query, ['page', 'limit', 'sort', 'order', 'select'])

  Object.keys(filter).forEach((key) => {
    if (
      filter[key] === null ||
      filter[key] === undefined ||
      filter[key] === ''
    ) {
      delete filter[key]
    }
  })

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

  // Sử dụng aggregate để lấy danh sách exercises với số lượng người dùng đã hoàn thành
  const exercises = await exerciseModel.aggregate([
    {
      $match: { isPublic: true, ...filter } // Chỉ lấy bài tập công khai
    },
    {
      $addFields: {
        completedUsersCount: { $size: '$completedUsers' }, // Đếm số lượng người dùng đã hoàn thành
        difficult: {
          $subtract: [
            { $size: '$lemmaWords' }, // Độ dài của mảng lemmaWords
            { $ifNull: [{ $arrayElemAt: ['$checkList.match', 0] }, 0] } // Giá trị checkList[0].match
          ]
        }
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
        as: 'firstUser'
      }
    },
    {
      $unwind: {
        path: '$firstUser',
        preserveNullAndEmptyArrays: true // Giữ lại bài tập nếu không tìm thấy người dùng
      }
    }
  ])

  // Nhóm các bài tập theo category và đếm số lượng bài tập cho từng category
  const categories = await exerciseModel.aggregate([
    { $match: { isPublic: true, ...filter } }, // Chỉ lấy bài tập công khai
    { $group: { _id: '$category', count: { $sum: 1 } } }, // Nhóm theo category
    { $project: { _id: 0, name: '$_id', count: 1 } }, // Chọn trường trả về
    { $sort: { count: -1 } }
  ])

  return { exercises, totalExercises, categories }
}

const getExercise = async (id) => {
  return await exerciseModel.findById(id)
}

// comment exercise
const createComment = async (exerciseId, user, content, parentId) => {
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
    userId: user.id,
    content,
    parentId: newParentId, // Lưu trữ parentId gốc cho comment mới
    mentionUserId // Đưa mentionUserId vào
  })

  if (newComment) {
    await exerciseModel.findByIdAndUpdate(exerciseId, {
      $addToSet: { commentedUsers: user.id }, // Chỉ thêm nếu user chưa tồn tại
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
  getUserList,
  getUserDictations,
  createDictation,
  toggleLikeExercise,
  toggleLikeComment,
  getExerciseComments,
  createComment,
  getExercise,
  getExercises,
  adminCreateExercise,
  updateDictationSegment,
  getDictation,
  checkVideo,
  createExercise
}
export default exerciseService
