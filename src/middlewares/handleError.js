const handleError = (err, req, res, next) => {
  // format error info
  const error = {
    status: 'ERROR',
    message: err.message
  }
  const httpCode = err.httpCode || 500

  // log more info to easier check error
  console.log('\nERROR')
  console.log('Request: ', req.method, req.originalUrl, httpCode)
  console.log('Body: ', req.body)
  console.log('Params: ', req.params)
  console.log('Query: ', req.query)
  console.log('Message: ', err.message)
  console.log('END ERROR')

  return res.status(httpCode).json(error)
}

export default handleError
