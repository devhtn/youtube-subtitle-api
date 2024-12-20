import { translate } from '@vitalets/google-translate-api'
import axios from 'axios'
import nlp from 'compromise'
import _ from 'lodash'
import lemmatizer from 'node-lemmatizer'
import { parseString } from 'xml2js'
import ytdlExec from 'youtube-dl-exec'

import MyError from '~/utils/MyError'

// import MyError from '~/utils/MyError'

import oxfordData from './oxfordData.json'

const tagTranslations = {
  // Danh từ
  Noun: 'Danh từ',
  Singular: 'Số ít',
  Plural: 'Số nhiều',

  // Động từ
  Verb: 'Động từ',
  Infinitive: 'Nguyên mẫu',
  PresentTense: 'Thì hiện tại',
  PastTense: 'Thì quá khứ',
  Gerund: 'Danh động từ V-ing',
  Participle: 'Phân từ (V-ed/V-ing)',

  // Tính từ
  Adjective: 'Tính từ',
  Comparative: 'So sánh hơn',
  Superlative: 'So sánh nhất',

  // Trạng từ
  Adverb: 'Trạng từ',
  NumericValue: 'Số đếm',
  TextValue: 'Số từ'
}
const validTags = Object.keys(tagTranslations)

// Function to handle range filtering
const handleRangeFilter = (filter, key) => {
  if (filter[key]) {
    if (typeof filter[key] === 'string') {
      filter[key] = [filter[key]]
    }
    const conditions = filter[key].map((range) => {
      const [min, max] = range.split('-')
      return max === ''
        ? { [key]: { $gte: +min } }
        : { [key]: { $gte: +min, $lt: +max } }
    })
    delete filter[key]
    filter.$or = [...(filter.$or || []), ...conditions]
  }
}

function isValidYouTubeVideoId(videoId) {
  // Kiểm tra độ dài
  if (videoId.length !== 11) {
    return false // Độ dài không đúng
  }

  // Kiểm tra ký tự hợp lệ (chỉ cho phép chữ cái, số, gạch dưới và dấu gạch ngang)
  const validPattern = /^[a-zA-Z0-9_-]{11}$/
  return validPattern.test(videoId)
}

function getVideoId(url) {
  // Định nghĩa các biểu thức chính quy để khớp các dạng URL của YouTube
  const regexStandard =
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/
  const regexShort = /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/
  const regexShorts =
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/

  // Thử khớp với đường dẫn chuẩn
  const matchStandard = url.match(regexStandard)
  if (matchStandard && matchStandard[1]) {
    const videoId = matchStandard[1]
    return isValidYouTubeVideoId(videoId) ? videoId : null
  }

  // Thử khớp với đường dẫn rút gọn
  const matchShort = url.match(regexShort)
  if (matchShort && matchShort[1]) {
    const videoId = matchShort[1]
    return isValidYouTubeVideoId(videoId) ? videoId : null
  }

  // Thử khớp với đường dẫn của Shorts
  const matchShorts = url.match(regexShorts)
  if (matchShorts && matchShorts[1]) {
    const videoId = matchShorts[1]
    return isValidYouTubeVideoId(videoId) ? videoId : null
  }

  // Nếu không khớp, trả về null
  return null
}

const addTransText = async (videoInfo) => {
  const translated = await translate(videoInfo.textsToTranslate, {
    to: 'vi'
  })
  // Chia lại các đoạn dịch bằng cách sử dụng cùng một dấu phân cách
  const translatedTexts = translated.text.split('\n')
  // Kiểm tra nếu không có kết quả dịch
  if (!translated || !translated.text) {
    throw new MyError('Translation failed')
  }

  // Kiểm tra số lượng đoạn dịch có khớp với số lượng segment không
  if (translatedTexts.length !== videoInfo.segments.length) {
    throw new MyError(
      'Mismatch between number of segments and translated texts.'
    )
  }
  translatedTexts.forEach((transText, index) => {
    videoInfo.segments[index].transText = transText.trim() // Trimming để loại bỏ khoảng trắng không cần thiết
  })
  delete videoInfo.textsToTranslate
  return videoInfo
}

const getInfoVideo = async (videoId, level) => {
  // Lấy thông tin video và phụ đề
  const video = await ytdlExec(videoId, { dumpSingleJson: true })
  if (_.isEmpty(video.subtitles)) throw new MyError('Video không có phụ đề!')

  if (video.duration > 1200)
    throw new MyError('Video nên có thời lượng nhỏ hơn 20 phút!')
  if (video.duration > 240 && level < 1000)
    throw new MyError(
      'Bạn cần đạt cấp độ 1000 để làm bài tập với video trên 4 phút!'
    )

  const videoInfo = {
    videoId: video.id,
    title: video.title,
    duration: video.duration,
    thumbnails: [null, null, null, video.thumbnails[33]],
    category: video.categories[0]
  }

  let subtitleUrl = null

  if (video.subtitles?.en?.[1]?.url) {
    // Nếu có thuộc tính 'en' và có ít nhất một subtitle (với url)
    subtitleUrl = video.subtitles.en[1].url
  } else if (video.subtitles?.['en-GB']?.[1]?.url) {
    // Nếu không có 'en' nhưng có 'en-GB' và ít nhất một subtitle (với url)
    subtitleUrl = video.subtitles['en-GB'][1].url
  }
  if (!subtitleUrl) throw new MyError('Video không hỗ phụ đề tiếng Anh!')

  const response = await axios.get(subtitleUrl)
  const xmlData = await response.data

  return new Promise((resolve, reject) => {
    parseString(xmlData, (err, result) => {
      if (err) {
        reject('Error parsing XML: ' + err)
      } else {
        const subtitles = result.transcript.text

        // Kiểm tra subtitle cuối cùng ngay lập tức
        const lastSubtitle = subtitles[subtitles.length - 1]
        const lastStart = parseFloat(lastSubtitle.$.start)
        const lastDur = parseFloat(lastSubtitle.$.dur)
        const lastEnd = (lastStart + lastDur).toFixed(3)

        // Kiểm tra nếu thời gian kết thúc của subtitle cuối cùng vượt quá duration của video
        if (parseFloat(lastEnd) > video.duration) {
          reject(
            new MyError(
              'Phụ đề bị lỗi, thời gian kết thúc của subtitle vượt quá thời gian video!'
            )
          )
          return
        }

        const segments = []
        let textsToTranslate = ''
        // Khởi tạo các Set để lưu trữ từ duy nhất và các biến đếm
        let lemmaWordsSet = new Set()
        let totalDictationWords = 0
        let totalTime = 0
        let totalWords = 0
        for (let i = 0; i < subtitles.length; i++) {
          const text = subtitles[i]._.replace(/\n/g, ' ')
            .replace(/(\(.*?\)|\[.*?\]|\*\*.*?\*\*|<.*?>)/g, '')
            .replace(/&#39;/g, "'")
            .replace(/&quot;/g, '"')
            .replace(/&lt;br&gt;/g, '')
            .replace(/\s+/g, ' ') // Thay thế các khoảng trắng đặc biệt
            .replace(/’/g, "'") // Đổi tất cả dấu nháy móc thành nháy thẳng
            .replace(/([^\s])([!?])/g, '$1 $2') // Thêm khoảng trắng trước dấu ! hoặc ?
            .trim() // Loại bỏ khoảng trắng ở đầu và cuối
          if (/^[^a-zA-Z0-9]*$/.test(text)) continue
          textsToTranslate += text + (i < subtitles.length - 1 ? '\n' : '')
          const start = subtitles[i].$.start
          const dur = subtitles[i].$.dur
          const end = (parseFloat(start) + parseFloat(dur)).toFixed(3)

          const { lemmatizedWords, dictationWords, tags } =
            exerciseUtil.parseSub(text)
          lemmatizedWords.forEach((word) => lemmaWordsSet.add(word))
          totalDictationWords += dictationWords.length
          // Tính thời gian và số từ
          if (dur > 0) {
            totalTime += parseFloat(dur)
            totalWords += tags.length
          }

          segments.push({
            start,
            end,
            text,
            lemmaSegmentWords: lemmatizedWords,
            dictationWords,
            tags
          })
        }
        // Kiểm tra nếu segments rỗng
        if (segments.length === 0) {
          reject(new MyError('Phụ đề của video không hợp lệ!'))
        } else {
          videoInfo.segments = segments
          videoInfo.textsToTranslate = textsToTranslate
          videoInfo.avgSpeed =
            totalTime > 0 ? ((totalWords * 60) / totalTime).toFixed(0) : 0
          videoInfo.totalDictationWords = totalDictationWords
          videoInfo.lemmaWords = Array.from(lemmaWordsSet)

          // Tạo danh sách đối chiếu từ vựng với `wordLists`
          videoInfo.difficult =
            lemmaWordsSet.size -
            exerciseUtil.calcWordMatch(videoInfo.lemmaWords, oxfordData.words)

          resolve(videoInfo) // Trả về JSON
        }
      }
    })
  })
}

const parseSub = (text) => {
  // youtube subtitle đã có sẵn một số quy tắt để đảm bảo phụ đề chuẩn, chỉ cần chỉnh sửa
  // loại bỏ phần văn bản bắt đầu bằng ( hoặc [ và kế thúc ) hoặc ]
  const textTags = nlp(text).out('tags')

  let mergedTextTags = textTags.reduce((acc, obj) => {
    Object.keys(obj).forEach((key) => {
      acc[key] = obj[key] // Ghi đè nếu thuộc tính đã tồn tại
    })
    return acc
  }, {})
  mergedTextTags = Object.entries(mergedTextTags)
  let cleanTags = mergedTextTags.filter((el) => {
    return (
      /^[a-zA-Z0-9']+$/.test(el[0]) &&
      !/([a-zA-Z])\1\1/i.test(el[0]) &&
      !el[1].includes('Acronym')
    )
  })

  const allArrayWords = text.split(' ')
  // xử lý lấy từ vựng cần chép chính tả
  const dictationWords = new Set()
  const newCleanTags = []
  const cleanLemmaTags = []
  allArrayWords.forEach((word) => {
    // Loại bỏ toàn bộ kí tự đặc biệt chỉ giữ lại chữ và số
    const cleanWord = word.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
    // Tìm kiếm trong sentenceTags
    const found = cleanTags.find((el) => el[0] === cleanWord)

    let validTranslatedTags = []
    if (found) {
      //xử lý các tag gợi ý
      if (
        !(
          (found[1].includes('ProperNoun') && /^[A-Z]/.test(cleanWord)) ||
          found[1].includes('Possessive') ||
          found[1].includes('Copula')
        )
      ) {
        validTranslatedTags = found[1].filter((tag) => validTags.includes(tag))
        if (validTranslatedTags.length > 0) {
          dictationWords.add(cleanWord)
          cleanLemmaTags.push(found)
        }
      }
    }
    // Trường hợp không tìm thấy, tức là từ viết tắt đã bị tách ra làm 2 thành phần
    else {
      validTranslatedTags.push('')
    }

    const textTags =
      validTranslatedTags.map((tag) => tagTranslations[tag]).join(' - ') || null // Ghép tag thành chuỗi
    newCleanTags.push(textTags)
  })

  const lemmatizedWords = new Set()
  cleanLemmaTags.forEach((tagWord) => {
    const word = tagWord[0]
    const tags = tagWord[1] // tags là array chứa nhiều loại từ
    let lemma

    if (tags.includes('Verb')) {
      lemma = lemmatizer.only_lemmas(word, 'verb')
    } else if (tags.includes('Noun')) {
      lemma = lemmatizer.only_lemmas(word, 'noun')
    } else if (tags.includes('Adjective')) {
      lemma = lemmatizer.only_lemmas(word, 'adj')
    } else {
      lemma = [word] // Giữ nguyên từ nếu không phải động từ, danh từ hoặc tính từ
    }

    // Đảm bảo `lemma` là mảng, nếu không, chuyển nó thành mảng
    if (!Array.isArray(lemma)) {
      lemma = [lemma]
    }

    // Nếu `lemma` có nhiều hơn 1 phần tử, giữ lại từ gốc ban đầu
    if (lemma.length > 1) {
      lemma = [word]
    }

    // Thêm tất cả từ trong `lemma` vào `Set`
    lemma.forEach((lem) => lemmatizedWords.add(lem))
  })

  return {
    lemmatizedWords: [...lemmatizedWords], // Chuyển `Set` thành mảng
    dictationWords: [...dictationWords], // Sao chép `dictationWords` thành mảng
    tags: [...newCleanTags] // Sao chép `newCleanTags` thành mảng
  }
}

const calcWordMatch = (words, wordList) => {
  const setWordList = new Set(wordList.map((word) => word))

  let matchCount = 0
  words.forEach((word) => {
    // Nếu phần tử là chuỗi đơn
    if (setWordList.has(word.toLowerCase())) matchCount++
  })

  return matchCount
}

const exerciseUtil = {
  handleRangeFilter,
  addTransText,
  getVideoId,
  getInfoVideo,
  parseSub,
  calcWordMatch
}

export default exerciseUtil
