import MyError from '~/utils/MyError'

import exerciseService from './exerciseService'
import exerciseUtil from './exerciseUtil'

const checkVideo = async (req, res) => {
  const { link } = req.body
  const videoId = exerciseUtil.getVideoId(link)
  if (!videoId) throw MyError('Đường dẫn không hợp lệ')
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

const getAllExercises = async (req, res) => {
  const response = await exerciseService.getAllExercises()
  return res.status(201).json(response)
}

const getExercise = async (req, res) => {
  const { videoId } = req.params
  const response = await exerciseService.getExercise(videoId)
  return res.status(201).json(response)
}

const exerciseController = {
  getExercise,
  getAllExercises,
  updateDictationProcess,
  updateDictationSegmentNote,
  getDictation,
  checkVideo,
  createExercise
}

export default exerciseController
