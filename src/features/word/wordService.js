import wordModel from '~/models/wordModel'

const LEVEL_DURATION = {
  1: 3 * 24 * 60 * 60 * 1000, // 3 ngày
  2: 7 * 24 * 60 * 60 * 1000, // 1 tuần
  3: 14 * 24 * 60 * 60 * 1000, // 2 tuần
  4: 30 * 24 * 60 * 60 * 1000, // 1 tháng
  5: 90 * 24 * 60 * 60 * 1000, // 3 tháng
  6: 180 * 24 * 60 * 60 * 1000, // 6 tháng
  7: 360 * 24 * 60 * 60 * 1000, // 1 năm
  8: null // Vĩnh viễn
}

const addWords = async (words = [], userId) => {
  const newWordDocs = []
  for (const word of words) {
    // Tìm từ đã tồn tại trong cơ sở dữ liệu
    let wordDoc = await wordModel.findOne({
      userId,
      word
    })

    if (!wordDoc) {
      wordDoc = new wordModel({
        userId,
        word
      })
      newWordDocs.push(wordDoc)
    } else if (wordDoc.expired) {
      // Nếu đã hết hạn, giữ nguyên level và cập nhật startAt và expired
      wordDoc.expired = false
      wordDoc.start = Date.now()
      newWordDocs.push(wordDoc)
    } else {
      // Nếu chưa hết hạn, tăng level và cập nhật startAt
      const timeElapsed = Date.now() - wordDoc.start
      const previousLevelDuration = LEVEL_DURATION[wordDoc.level - 1] || 0 // Lấy thời gian của cấp độ trước đó, nếu cấp độ là 1 thì coi như 0
      if (timeElapsed >= previousLevelDuration) {
        wordDoc.level = Math.min(wordDoc.level + 1, 8) // Giới hạn cấp độ tối đa là 8
      }
    }
    await wordDoc.save()
  }
  return newWordDocs
}

const refreshWords = async (userId) => {
  // Đếm số từ đã hết hạn
  let expiredCount = 0
  // Mảng chứa các từ còn hiệu lực (expired = false)
  const levelWords = []

  // Lấy thời gian bắt đầu của ngày hiện tại (00:00)
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0) // Đặt giờ, phút, giây, và mili giây về 0

  // Tìm tất cả các từ vựng của user
  const wordDocs = await wordModel.find({ userId, expired: false })

  // Duyệt qua từng từ vựng và kiểm tra điều kiện expired
  for (let wordDoc of wordDocs) {
    const currentDuration = LEVEL_DURATION[wordDoc.level]
    const timeSinceStart = todayStart.getTime() - wordDoc.start

    // Kiểm tra nếu đã hết hạn (timeSinceStart > currentDuration)
    if (currentDuration && timeSinceStart > currentDuration) {
      wordDoc.expired = true
      await wordDoc.save() // Cập nhật từ vựng trong database
      expiredCount++ // Tăng số lượng từ đã hết hạn
    } else {
      // Nếu từ còn hiệu lực, thêm vào mảng validWords
      levelWords.push(wordDoc)
    }
  }

  // Trả về số lượng từ hết hạn và danh sách từ còn hiệu lực
  // return { expiredCount: expiredWords.length, levelWords }
  return { expiredCount, levelWords }
}

const getForgetWords = async (userId) => {
  // Tìm các từ của người dùng với `expired: true`
  const forgottenWords = await wordModel.find({
    userId: userId,
    expired: true
  })

  // Lọc và trả về mảng các chuỗi (chỉ chứa trường `word`)
  return forgottenWords.map((doc) => doc.word)
}

const getLevelWords = async (userId) => {
  // Tìm các từ của người dùng với `expired: true`
  const levelWords = await wordModel.find({
    userId: userId,
    expired: false
  })

  // Lọc và trả về mảng các chuỗi (chỉ chứa trường `word`)
  return levelWords.map((doc) => doc.word)
}

const getLevel = async (userId) => {
  const words = await wordModel.find({ userId, expired: false })
  return words.length
}

const wordService = {
  getLevel,
  getForgetWords,
  getLevelWords,
  refreshWords,
  addWords
}
export default wordService
