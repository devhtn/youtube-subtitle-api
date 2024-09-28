import axios from 'axios'
import nlp from 'compromise'
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

const parseSub = (text) => {
  const textTags = nlp(text).out('tags')
  let mergedTextTags = textTags.reduce((acc, obj) => {
    Object.keys(obj).forEach((key) => {
      acc[key] = obj[key] // Ghi đè nếu thuộc tính đã tồn tại
    })
    return acc
  }, {})
  mergedTextTags = Object.entries(mergedTextTags)
  const cleanTags = mergedTextTags.filter((el) => {
    return /^[a-zA-Z0-9']+$/.test(el[0])
  })

  // Xử lý để lấy dictationWords
  const arrayWords = [
    ...new Set(text.toLowerCase().replace(/\s+/g, ' ').split(' '))
  ]
  const dictationWords = []
  arrayWords.forEach((word) => {
    // Tạo biến cleanWord chỉ một lần
    const cleanWord = word
      .replace(/^[^a-zA-Z0-9]+/, '')
      .replace(/[^a-zA-Z0-9]+$/, '')

    if (/^[a-zA-Z0-9']+$/.test(cleanWord)) {
      // Tìm kiếm trong sentenceTags
      const found = cleanTags.find((el) => el[0] === cleanWord)

      // Kiểm tra nếu là dạng từ viết tắt (contraction)
      const isContraction = /\b\w+'\w+\b/.test(cleanWord)

      if (isContraction) {
        if (!found || found[1].includes('Possessive')) {
          if (found) {
            const possTag = Object.entries(
              nlp(cleanWord.split("'")[0]).out('tags')[0]
            )[0]
            if (!possTag[1].includes('ProperNoun')) {
              dictationWords.push(cleanWord)
            }
          } else {
            dictationWords.push(cleanWord)
          }
        }
      } else if (found && !found[1].includes('ProperNoun')) {
        dictationWords.push(cleanWord)
      }
    }
  })
  const jsonDictationWords = dictationWords.map((item) => ({
    word: item
  }))

  // Xử lý để lấy lemmatizedWords
  const tagWords = []
  const removeTags = new Set() // Sử dụng Set để kiểm tra sự tồn tại nhanh hơn

  cleanTags.forEach((tag) => {
    const word = tag[0]
    const tags = tag[1]

    // Kiểm tra xem từ có chứa dấu ' hay không
    if (/\b\w+'\w+\b/.test(word)) {
      if (tags.includes('Possessive')) {
        const possTag = Object.entries(
          nlp(word.split("'")[0]).out('tags')[0]
        )[0]
        // Kiểm tra không phải danh từ riêng
        if (!possTag[1].includes('ProperNoun')) {
          tagWords.push(possTag)
        }
        removeTags.add(tag[0]) // Thêm vào Set
      } else {
        removeTags.add(tag[0])
      }
    } else if (/^[a-zA-Z]+$/.test(word)) {
      // Kiểm tra chỉ chứa chữ cái
      if (!tags.includes('ProperNoun')) {
        tagWords.push(tag)
      }
    }
  })

  // Lọc các tagWords bằng cách kiểm tra trong removeTags
  const cleanTagWords = tagWords.filter((tag) => !removeTags.has(tag[0]))

  const lemmatizedWords = []
  cleanTagWords.forEach((tagWord) => {
    const word = tagWord[0]
    const tags = tagWord[1] // tags là array chứa nhiều loại từ
    let lemma

    if (tags.includes('Verb')) {
      // Nếu tags chứa 'Verb'
      lemma = lemmatizer.only_lemmas(word, 'verb')
    } else if (tags.includes('Noun')) {
      // Nếu tags chứa 'Noun'
      lemma = lemmatizer.only_lemmas(word, 'noun')
    } else if (tags.includes('Adjective')) {
      // Nếu tags chứa 'Adjective'
      lemma = lemmatizer.only_lemmas(word, 'adj')
    } else {
      lemma = [word] // Giữ nguyên từ nếu không phải là động từ, danh từ hoặc tính từ
    }

    if (lemma.length > 1) {
      // Nếu lemma có 2 phần tử, push dạng mảng chứa 2 phần tử
      lemmatizedWords.push(lemma)
    } else {
      // Nếu chỉ có 1 phần tử, push phần tử đó
      lemmatizedWords.push(...lemma)
    }
  })

  return { lemmatizedWords, jsonDictationWords, lengthWords: arrayWords.length }
}

const calcWordMatch = (words, wordList) => {
  const setWordList = new Set(wordList.map((word) => word))

  let matchCount = 0
  words.forEach((word) => {
    if (Array.isArray(word)) {
      // Nếu phần tử là một mảng, kiểm tra từng từ trong mảng
      const hasMatch = word.some((el) => setWordList.has(el))
      if (hasMatch) {
        matchCount++
      }
    }
    // Nếu phần tử là chuỗi đơn
    else if (setWordList.has(word.toLowerCase())) matchCount++
  })

  return matchCount
}

const noteUtil = {
  getInfoVideo,
  parseSub,
  calcWordMatch
}

export default noteUtil
