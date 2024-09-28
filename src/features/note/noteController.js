import noteService from './noteService'
import noteModel from '~/models/noteModel'

const checkVideo = async (req, res) => {
  const { link } = req.body

  const result = await noteService.checkVideo(link)
  return res.status(201).json(result)
}

const addNote = async (req, res) => {
  const videoInfo = req.body
  const user = req.user
  const addNote = await noteService.addNote(videoInfo, user)
  return res.status(201).json(addNote)
}

const getDictation = async (req, res) => {
  const videoId = req.params.id
  const userId = req.user.id
  const dictation = await noteService.getDictation(videoId, userId)
  return res.status(201).json(dictation)
}

const updateSegment = async (req, res) => {
  const { id, segment, countCompletedWords } = req.body
  const dictationId = id
  const dictation = await noteService.updateSegment(
    segment,
    dictationId,
    countCompletedWords
  )
  return res.status(201).json(dictation)
}

const noteController = {
  updateSegment,
  getDictation,
  checkVideo,
  addNote
}

export default noteController
