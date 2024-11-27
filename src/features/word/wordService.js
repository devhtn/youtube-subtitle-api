import wordModel from '~/models/wordModel'

const LEVEL_DURATION = {
  1: 1 * 24 * 60 * 60 * 1000, // 1 ngày
  2: 3 * 24 * 60 * 60 * 1000, // 3 ngày
  3: 7 * 24 * 60 * 60 * 1000, // 1 tuần
  4: 14 * 24 * 60 * 60 * 1000, // 2 tuần
  5: 30 * 24 * 60 * 60 * 1000, // 1 tháng
  6: 90 * 24 * 60 * 60 * 1000, // 3 tháng
  7: 180 * 24 * 60 * 60 * 1000, // 6 tháng
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
      // Nếu từ chưa tồn tại, thêm mới từ với startAt là thời điểm hiện tại
      wordDoc = new wordModel({
        userId,
        word,
        startAt: Date.now()
      })
      newWordDocs.push(wordDoc)
    } else if (wordDoc.expired) {
      // Nếu đã hết hạn, giữ nguyên level và cập nhật startAt và expired
      wordDoc.startAt = Date.now()
      wordDoc.expired = false
      newWordDocs.push(wordDoc)
    } else {
      // Nếu chưa hết hạn, tăng level và cập nhật startAt
      wordDoc.level = Math.min(wordDoc.level + 1, 8) // Giới hạn tối đa level là 8
      wordDoc.startAt = Date.now()
    }
    await wordDoc.save()
  }
  return newWordDocs
}

const refreshWords = async (userId) => {
  // Đếm số từ đã hết hạn
  const expiredWords = []
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
    const timeSinceStart = todayStart.getTime() - wordDoc.startAt

    // Kiểm tra nếu đã hết hạn (timeSinceStart > currentDuration)
    if (currentDuration && timeSinceStart > currentDuration) {
      wordDoc.expired = true
      await wordDoc.save() // Cập nhật từ vựng trong database
      expiredWords.push(wordDoc.word) // Tăng số lượng từ đã hết hạn
    } else {
      // Nếu từ còn hiệu lực, thêm vào mảng validWords
      levelWords.push(wordDoc)
    }
  }

  // Trả về số lượng từ hết hạn và danh sách từ còn hiệu lực
  // return { expiredCount: expiredWords.length, levelWords }
  return { expiredCount: expiredWords.length, levelWords }
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

const getLevel = async (userId) => {
  const words = await wordModel.find({ userId, expired: false })
  return words.length
}

const wordService = {
  getLevel,
  getForgetWords,
  refreshWords,
  addWords
}
export default wordService
