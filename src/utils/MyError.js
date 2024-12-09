class MyError extends Error {
  constructor(message, httpCode) {
    // Nếu message là object, chuyển nó thành chuỗi JSON
    if (typeof message === 'object' && message !== null) {
      message = JSON.stringify(message) // Chuyển object thành chuỗi JSON
    }
    super(message) // Gọi constructor của lớp Error với message
    this.httpCode = httpCode
  }
}

export default MyError
