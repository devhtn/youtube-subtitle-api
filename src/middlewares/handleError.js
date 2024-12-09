const handleError = (err, req, res, next) => {
  // format error info
  let message = err.message // Dùng message của err ban đầu

  // Kiểm tra và parse err.message nếu nó là chuỗi JSON hợp lệ
  try {
    // Kiểm tra nếu message là chuỗi JSON hợp lệ, thì parse thành object
    if (typeof message === 'string') {
      message = JSON.parse(message) // Cố gắng parse message
    }
  } catch {
    // Nếu parse thất bại, message sẽ giữ nguyên như cũ
  }

  const error = {
    status: 'ERROR',
    message // Trả về message đã được parse nếu có
  }

  const httpCode = err.httpCode || 500

  // Log thêm thông tin để kiểm tra lỗi dễ dàng hơn
  console.log('\nERROR')
  console.log('Request: ', req.method, req.originalUrl, httpCode)
  console.log('Body: ', req.body)
  console.log('Params: ', req.params)
  console.log('Query: ', req.query)
  console.log('Error: ', err.stack)
  console.log('END ERROR')

  return res.status(httpCode).json(error)
}

export default handleError
