import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'

import wordService from '../word/wordService'
import { notifyModel } from '~/models/notifyModel'
import studyStatisticModel from '~/models/studyStatisticModel'
import { filterQuery } from '~/utils'

dayjs.extend(customParseFormat)

const createNewDay = async (userId) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const day = await studyStatisticModel.findOne({
    userId,
    day: today
  })

  const { expiredCount, levelWords } = await wordService.refreshWords(userId)

  if (!day) {
    // Nếu chưa tồn tại, tạo document mới
    const newDayRecord = new studyStatisticModel({
      userId,
      day: today,
      forgetWordsCount: expiredCount
    })
    await newDayRecord.save()

    // Thông báo từ vựng đã quên mỗi ngày
    if (expiredCount > 0) {
      await notifyModel.create({
        userId,
        message: `Hôm nay bạn có ${expiredCount} từ vựng có thể bạn đã quên!`,
        type: 'Word'
      })
    }
  }
  return { expiredCount, levelWords }
}

const updateDay = async (userId, dataFields = {}) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const day = await studyStatisticModel.findOne({
    userId,
    day: today
  })

  if (!day) {
    const { expiredCount } = await wordService.refreshWords(userId)
    // Nếu chưa tồn tại, tạo document mới
    const newDayRecord = new studyStatisticModel({
      userId,
      day: today,
      forgetWordsCount: expiredCount,
      ...dataFields
    })

    await newDayRecord.save()
  } else {
    const updateData = {}

    // Nếu `dictationWordsCount` có trong `dataFields`, tăng giá trị hiện tại
    if (dataFields.totalCorrectedWords) {
      updateData.dictationWordsCount =
        day.dictationWordsCount + dataFields.totalCorrectedWords
    }

    // Nếu `newWordsCount` có trong `dataFields`, tăng giá trị hiện tại
    if (dataFields.newLevelWordsCount) {
      updateData.newWordsCount =
        day.newWordsCount + dataFields.newLevelWordsCount
    }

    // Cập nhật document với các thay đổi
    if (Object.keys(updateData).length > 0) {
      await studyStatisticModel.updateOne(
        { _id: day._id },
        { $set: updateData }
      )
    }
  }
}

const getDays = async (query) => {
  const filter = filterQuery(query)

  // handle month
  if (filter.month) {
    const startOfMonth = dayjs(`${filter.month}`, 'MM-YYYY')
    const endOfMonth = startOfMonth.endOf('month')
    filter.day = {
      $gte: startOfMonth.toDate(), // Ngày đầu tháng
      $lte: endOfMonth.toDate() // Ngày cuối tháng
    }
    delete filter.month
  }

  const days = await studyStatisticModel.find({ ...filter })
  return days
}

const statisticService = {
  getDays,
  updateDay,
  createNewDay
}
export default statisticService
