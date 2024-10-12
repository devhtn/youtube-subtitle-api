import MyError from '~/utils/MyError'

import exerciseService from './exerciseService'
import exerciseUtil from './exerciseUtil'

const checkVideo = async (req, res) => {
  const { link } = req.body
  const videoId = exerciseUtil.getVideoId(link)
  if (!videoId) throw new MyError('Đường dẫn không hợp lệ')
  const response = await exerciseService.checkVideo(videoId)
  return res.status(201).json(response)
}

const createExercise = async (req, res) => {
  const videoInfo = req.body
  const user = req.user
  let response
  if (user.role === 'admin')
    response = await exerciseService.createPublicExercise(videoInfo, user)
  else response = await exerciseService.createExercise(videoInfo, user)
  return res.status(201).json(response)
}

const getDictation = async (req, res) => {
  const videoId = req.params.id
  const userId = req.user.id
  const response = await exerciseService.getDictation(videoId, userId)
  return res.status(201).json(response)
}

const updateDictationProcess = async (req, res) => {
  const { dictationId, segmentId } = req.params
  const response = await exerciseService.updateDictation(
    dictationId,
    segmentId,
    { isCompleted: true }
  )
  return res.status(201).json(response)
}

const updateDictationSegmentNote = async (req, res) => {
  const { dictationId, segmentId } = req.params
  const { note } = req.body
  const response = await exerciseService.updateDictation(
    dictationId,
    segmentId,
    { note }
  )
  return res.status(201).json(response)
}

const getExercises = async (req, res) => {
  const response = await exerciseService.getExercises()
  return res.status(201).json(response)
}

const getExercise = async (req, res) => {
  const { videoId } = req.params
  const response = await exerciseService.getExercise(videoId)
  return res.status(201).json(response)
}

const createComment = async (req, res) => {
  const { exerciseId } = req.params
  const userId = req.user.id
  const { content, parentId } = req.body
  const response = await exerciseService.createComment(
    exerciseId,
    userId,
    content,
    parentId
  )
  return res.status(201).json(response)
}
const getExerciseComments = async (req, res) => {
  const { exerciseId } = req.params
  const response = await exerciseService.getExerciseComments(exerciseId)
  return res.status(201).json(response)
}

const toggleLikeComment = async (req, res) => {
  const userId = req.user.id
  const { commentId } = req.body
  const response = await exerciseService.toggleLikeComment(commentId, userId)
  return res.status(201).json(response)
}

const toggleLikeList = async (req, res) => {
  const user = req.user
  const { exerciseId } = req.body
  const response = await exerciseService.toggleLikeList(exerciseId, user)
  return res.status(201).json(response)
}
const getUserDictations = async (req, res) => {
  const user = req.user
  const query = req.query
  const response = await exerciseService.getUserDictations(user, query)
  return res.status(201).json(response)
}

const exerciseController = {
  getUserDictations,
  toggleLikeList,
  toggleLikeComment,
  getExerciseComments,
  createComment,
  getExercise,
  getExercises,
  updateDictationProcess,
  updateDictationSegmentNote,
  getDictation,
  checkVideo,
  createExercise
}

export default exerciseController
