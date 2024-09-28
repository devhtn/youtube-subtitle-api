import MyError from '~/utils/MyError'

import noteUtil from './noteUtil'
import dictationModel from '~/models/dictationModel'
import noteModel from '~/models/noteModel'
import wordListModel from '~/models/wordListModel'

const checkVideo = async (linkVideo) => {
  const videoWords = []

  const videoInfo = await noteUtil.getInfoVideo(linkVideo)

  let sumAvgSpeed = 0
  videoInfo.subs.forEach((el) => {
    const { lemmatizedWords, jsonDictationWords, lengthWords } =
      noteUtil.parseSub(el.text)
    el.dictationWords = jsonDictationWords
    videoWords.push(...lemmatizedWords)
    const duration = el.end - el.start
    if (duration > 0) {
      sumAvgSpeed += lengthWords / duration
    }
  })
  videoInfo.avgSpeed = (sumAvgSpeed / videoInfo.subs.length).toFixed(2)

  const uniqWords = Array.from(new Set(videoWords))
  videoInfo.countWords = uniqWords.length

  const wordLists = await wordListModel.find({})
  const checkList = wordLists.map((el) => {
    return {
      name: el.name,
      desc: el.desc,
      match: noteUtil.calcWordMatch(uniqWords, el.words)
    }
  })
  videoInfo.checkList = checkList

  return videoInfo
}

const addNote = async (info, user) => {
  let note = await noteModel.findOne({
    videoId: info.videoId
  })
  if (note) {
    const dictation = dictationModel
      .findOne({
        noteId: note.id,
        userId: user.id
      })
      .lean()

    if (!dictation) throw new Error('Video đã được bạn thêm vào trước đó')
    await dictationModel.create({
      userId: user._id,
      noteId: note._id,
      subs: note.subs,
      countWords: note.countWords
    })
  } else {
    info.userId = user.id
    note = await noteModel.create(info)
    await dictationModel.create({
      userId: user._id,
      noteId: note.id,
      subs: note.subs,
      countWords: note.countWords
    })
  }

  return note.videoId
}

const getDictation = async (videoId, userId) => {
  const note = await noteModel.findOne({ videoId })
  if (!note) throw new MyError('video id không tồn tại')
  return await dictationModel.findOne({ noteId: note._id, userId })
}

const updateSegment = async (segment, dictationId, countCompletedWords = 0) => {
  const updateFields = {
    $set: {
      'subs.$': segment // Cập nhật toàn bộ segment đó trong subs
    }
  }

  if (countCompletedWords > 0) {
    updateFields.$inc = { countCompletedWords } // Tăng giá trị của countCompletedWords
  }

  return await dictationModel.findOneAndUpdate(
    { _id: dictationId, 'subs._id': segment.id },
    updateFields,
    { new: true }
  )
}

const noteService = {
  updateSegment,
  getDictation,
  checkVideo,
  addNote
}
export default noteService
