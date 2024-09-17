import MyError from '~/utils/MyError'

import noteUtil from './noteUtil'
import noteModel from '~/models/noteModel'
import wordListModel from '~/models/wordListModel'

const checkVideo = async (linkVideo) => {
  const videoWords = []
  const contractionsVideo = []

  const videoInfo = await noteUtil.getInfoVideo(linkVideo)

  let sumAvgSpeedSentence = 0
  videoInfo.subs.forEach((el) => {
    const { lemmatizedWords, contractions } = noteUtil.getLemmatizedSentence(
      el.text
    )
    videoWords.push(...lemmatizedWords)
    contractionsVideo.push(...contractions)
    sumAvgSpeedSentence +=
      (lemmatizedWords.length + contractions.length) / (el.end - el.start)
  })

  videoInfo.avgSpeed = (sumAvgSpeedSentence / videoInfo.subs.length).toFixed(2)

  const uniqVideoWords = Array.from(new Set(videoWords))
  const uniqVideoContractions = Array.from(new Set(contractionsVideo))

  videoInfo.countWords = uniqVideoWords.length + uniqVideoContractions.length
  const wordLists = await wordListModel.find({})
  videoInfo.checkList = wordLists.map((el) => {
    return {
      name: el.name,
      desc: el.desc,
      match:
        noteUtil.calcWordMatch(uniqVideoWords, el.words) +
        uniqVideoContractions.length
    }
  })

  return videoInfo
}

const addNote = async (videoInfo, user) => {
  const isExist = await noteModel.findOne({
    videoId: videoInfo.videoId,
    userId: user.id
  })
  if (isExist) throw new Error('Bạn đã thêm video này trước đó', 409)
  const note = new noteModel(videoInfo)
  note.userId = user.id
  await note.save()
  return note.id
}

const getNote = async (id, userId) => {
  return await noteModel.findOne({ _id: id, userId })
}

const noteService = {
  getNote,
  checkVideo,
  addNote
}
export default noteService
