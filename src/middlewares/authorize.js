const authorize = (roles = []) => {
  // roles có thể là một mảng các quyền cần kiểm tra
  if (typeof roles === 'string') {
    roles = [roles] // Chuyển thành mảng nếu chỉ là 1 vai trò
  }

  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' }) // Người dùng không có quyền
    }
    next() // Người dùng có quyền
  }
}

export default authorize
