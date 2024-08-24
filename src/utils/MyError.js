class MyError extends Error {
  constructor(message, httpCode) {
    super(message)
    this.httpCode = httpCode
  }
}

export default MyError
