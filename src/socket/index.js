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

    // Sự kiện khi user đăng ký userId
    socket.on('register', (userId) => {
      socket.userId = userId // Gắn userId vào socket
      userSocketMap.set(userId, socket) // Lưu userId vào Map
      console.log(`User registered with ID: ${userId}`)
    })

    // Xử lý sự kiện ngắt kết nối
    socket.on('disconnect', () => {
      if (socket.userId) {
        userSocketMap.delete(socket.userId) // Xóa userId khỏi Map
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
  const socket = userSocketMap.get(userId) // Lấy socket dựa trên userId
  if (socket) {
    socket.emit(eventName, data) // Gửi sự kiện và dữ liệu kèm theo
  } else {
    console.log(`User with ID ${userId} not found`)
  }
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
