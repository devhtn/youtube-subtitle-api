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

const getNote = async (req, res) => {
  const { id } = req.params
  const userId = req.user.id
  const note = await noteService.getNote(id, userId)
  return res.status(201).json(note)
}

const noteController = {
  getNote,
  checkVideo,
  addNote
}

export default noteController
