import MyError from '~/utils/MyError'

import exerciseService from './exerciseService'
import exerciseUtil from './exerciseUtil'

const checkVideo = async (req, res) => {
  const user = req.user
  const { link } = req.body
  const videoId = exerciseUtil.getVideoId(link)
  if (!videoId) throw new MyError('Kiểm tra lại đường dẫn của bạn !')
  const response = await exerciseService.checkVideo(videoId, user)
  return res.status(201).json(response)
}

const createExercise = async (req, res) => {
  const videoInfo = req.body
  const user = req.user
  let response
  if (user.role === 'admin')
    response = await exerciseService.createPublicExercise(videoInfo, user.id)
  else response = await exerciseService.createExercise(videoInfo, user)
  return res.status(201).json(response)
}

const getDictation = async (req, res) => {
  const dictationId = req.params.id
  const response = await exerciseService.getDictation(dictationId)
  return res.status(201).json(response)
}
const updateDictation = async (req, res) => {
  const dictationId = req.params.id
  const dataFields = req.body
  const response = await exerciseService.updateDictation(
    dictationId,
    dataFields
  )
  return res.status(201).json(response)
}

const updateDictationSegment = async (req, res) => {
  const { dictationId, segmentId } = req.params
  const updateFields = req.body
  const userId = req.user.id
  const response = await exerciseService.updateDictationSegment(
    dictationId,
    segmentId,
    updateFields,
    userId
  )
  return res.status(201).json(response)
}

const getExercises = async (req, res) => {
  const query = req.query
  const user = req.user
  const response = await exerciseService.getExercises(query, user)
  return res.status(201).json(response)
}
const getCategories = async (req, res) => {
  const response = await exerciseService.getCategories()
  return res.status(201).json(response)
}

const getExercise = async (req, res) => {
  const { id } = req.params
  const response = await exerciseService.getExercise(id)
  return res.status(201).json(response)
}

const toggleLikeExercise = async (req, res) => {
  const user = req.user
  const { exerciseId } = req.body
  const response = await exerciseService.toggleLikeExercise(exerciseId, user)
  return res.status(201).json(response)
}

const toggleDislikeExercise = async (req, res) => {
  const user = req.user
  const { exerciseId } = req.body
  const response = await exerciseService.toggleDislikeExercise(exerciseId, user)
  return res.status(201).json(response)
}

const getUserDictations = async (req, res) => {
  const userId = req.user.id
  const query = req.query
  const response = await exerciseService.getUserDictations(userId, query)
  return res.status(201).json(response)
}

const createDictation = async (req, res) => {
  const userId = req.user.id
  const { exerciseId } = req.body
  const response = await exerciseService.createDictation(exerciseId, userId)
  return res.status(201).json(response)
}

const delDictation = async (req, res) => {
  const { id } = req.params
  const response = await exerciseService.delDictation(id)
  return res.status(201).json(response)
}

const getExerciseStatistic = async (req, res) => {
  const response = await exerciseService.getExerciseStatistic()
  return res.status(201).json(response)
}
const toggleLockExercise = async (req, res) => {
  const { exerciseId } = req.body
  const response = await exerciseService.toggleLockExercise(exerciseId)
  return res.status(201).json(response)
}

const exerciseController = {
  toggleLockExercise,
  toggleDislikeExercise,
  getExerciseStatistic,
  delDictation,
  createDictation,
  getUserDictations,
  toggleLikeExercise,
  getExercise,
  getExercises,
  updateDictationSegment,
  getDictation,
  checkVideo,
  createExercise,
  getCategories,
  updateDictation
}

export default exerciseController
