import axios from 'axios'
import lemmatizer from 'node-lemmatizer'
import pos from 'pos'
import tokenizer from 'wink-tokenizer'
import { parseString } from 'xml2js'
import ytdl from 'ytdl-core'

import MyError from '~/utils/MyError'

const getInfoVideo = async (link) => {
  // Lấy thông tin videoInfo
  const video = await ytdl.getInfo(link)
  const videoDetails = video.videoDetails
  const videoInfo = {}

  videoInfo.videoId = videoDetails.videoId
  videoInfo.title = videoDetails.title
  videoInfo.duration = videoDetails.lengthSeconds
  videoInfo.thumbnails = videoDetails.thumbnails
  videoInfo.chapters = videoDetails.chapters
  videoInfo.category = videoDetails.category

  const tracks =
    video.player_response.captions.playerCaptionsTracklistRenderer.captionTracks
  let subtitleTrack = tracks.find(
    (track) => track.languageCode.startsWith('en') && track.kind !== 'asr'
  )
  //
  if (subtitleTrack) {
    const subtitleUrl = subtitleTrack.baseUrl
    // Tải phụ đề XML
    const response = await axios.get(subtitleUrl)
    const xmlData = await response.data

    // Chuyển đổi XML sang JSON
    return new Promise((resolve, reject) => {
      parseString(xmlData, (err, result) => {
        if (err) {
          reject('Error parsing XML: ' + err)
        } else {
          const subtitles = result.transcript.text
          const newSubs = []
          for (let i = 0; i < subtitles.length; i++) {
            const text = subtitles[i]._.replace(/\n/g, ' ')
              .replace(/\s?\(.*?\)/g, '')
              .replace(/&#39;/g, "'")
              .replace(/&quot;/g, '"')
              .trim()
            if (!text) continue

            const start = subtitles[i].$.start
            const dur = subtitles[i].$.dur
            const end = (parseFloat(start) + parseFloat(dur)).toFixed(3)
            newSubs.push({
              start,
              end,
              text
            })
          }
          videoInfo.subs = newSubs
          resolve(videoInfo) // Trả về JSON
        }
      })
    })
  } else {
    throw new MyError('Video không có subtitles Tiếng Anh chuẩn')
  }
}

const splitContractions = (sentence) => {
  const contractions = []

  // Regular expression to match contractions (words containing ')
  const contractionRegex = /\b\w+'(?:\w+)?\b/g

  // Extract all contractions and store them in the array
  let match
  while ((match = contractionRegex.exec(sentence)) !== null) {
    contractions.push(match[0].toLowerCase())
  }

  // Remove the contractions from the original sentence
  const newSentence = sentence
    .replace(contractionRegex, '')
    .replace(/\s+/g, ' ')
    .trim()

  return { contractions, newSentence }
}

const getLemmatizedSentence = (sentence) => {
  const { contractions, newSentence } = splitContractions(sentence)
  const myTokenizer = tokenizer()
  const tokens = myTokenizer.tokenize(newSentence)
  const newWords = tokens
    .filter((el) => el.tag === 'word')
    .map((el) => el.value)
  const tagger = new pos.Tagger()
  const taggedWords = tagger.tag(newWords)
  const lemmatizedWords = []
  taggedWords.forEach((taggedWord) => {
    const word = taggedWord[0].toLowerCase()
    const tag = taggedWord[1]
    let lemma
    switch (tag) {
      case 'NNP':
        break
      case 'VBD': // Verb, past tense
      case 'VBG': // Verb, gerund/present participle
      case 'VBN': // Verb, past participle
      case 'VBP': // Verb, non-3rd person singular present
      case 'VBZ': // Verb, 3rd person singular present
        lemma = lemmatizer.only_lemmas(word.toLowerCase(), 'verb')
        break
      case 'NNS': // Plural noun
        lemma = lemmatizer.only_lemmas(word.toLowerCase(), 'noun')
        break
      case 'JJR': // Adjective, comparative
      case 'JJS': // Adjective, superlative
        lemma = lemmatizer.only_lemmas(word.toLowerCase(), 'adj')
        break
      default:
        lemma = [word] // Không thay đổi từ nếu không phải danh từ, động từ, tính từ, hoặc trạng từ
    }
    if (lemma) lemmatizedWords.push(...lemma)
  })

  return { lemmatizedWords, contractions }
}

const calcWordMatch = (words, wordList) => {
  const setWordList = new Set(wordList.map((word) => word.toLowerCase()))

  let matchCount = 0
  words.forEach((word) => {
    if (setWordList.has(word.toLowerCase())) {
      matchCount++
    }
  })

  // Tính phần trăm
  return matchCount
}

const noteUtil = {
  getInfoVideo,
  getLemmatizedSentence,
  calcWordMatch
}

export default noteUtil
