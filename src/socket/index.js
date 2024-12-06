let io // Lưu trữ instance của Socket.IO
const userSocketMap = new Map() // Map để ánh xạ userId -> socket

/**
 * Thiết lập Socket.IO và lắng nghe sự kiện kết nối
 * @param {Object} _io - Socket.IO server instance
 */
export const setupSocket = (_io) => {
  io = _io

  // Lắng nghe sự kiện kết nối từ client
  io.on('connection', (socket) => {
    console.log('A user connected:', socket.id)

    socket.on('register', (userId) => {
      socket.userId = userId
      if (!userSocketMap.has(userId)) {
        userSocketMap.set(userId, new Set())
        io.emit('user-online', userId) // Thông báo user online
      }
      userSocketMap.get(userId).add(socket)
    })

    socket.on('disconnect', () => {
      if (socket.userId) {
        const sockets = userSocketMap.get(socket.userId)
        if (sockets) {
          sockets.delete(socket)
          if (sockets.size === 0) {
            userSocketMap.delete(socket.userId)
            io.emit('user-offline', socket.userId) // Thông báo user offline
          }
        }
        console.log(`User with ID ${socket.userId} disconnected`)
      }
    })
  })
}

/**
 * Gửi tin nhắn tới user cụ thể bằng userId
 * @param {string} userId - ID của người dùng
 * @param {string} message - Nội dung tin nhắn
 */
export const sendMessageToUser = (userId, eventName, data) => {
  const sockets = userSocketMap.get(userId)
  if (sockets && sockets.size > 0) {
    sockets.forEach((socket) => {
      socket.emit(eventName, data)
    })
  } else {
    console.log(`User with ID ${userId} not found`)
  }
}

export const sendMessageToAllUsers = (eventName, data) => {
  userSocketMap.forEach((sockets) => {
    sockets.forEach((socket) => {
      socket.emit(eventName, data)
    })
  })
}

/**
 * Lấy instance của Socket.IO server
 * @returns {Object} io - Socket.IO server instance
 */
export const getIo = () => {
  if (!io) {
    throw new Error(
      'Socket.IO has not been initialized. Call setupSocket first.'
    )
  }
  return io
}
