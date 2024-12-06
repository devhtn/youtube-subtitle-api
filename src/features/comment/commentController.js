import commentService from './commentService'

const createComment = async (req, res) => {
  const user = req.user
  const { content, parentId, exerciseId, notifyAdmin } = req.body
  const response = await commentService.createComment(
    exerciseId,
    user,
    content,
    parentId,
    notifyAdmin
  )
  return res.status(201).json(response)
}
const getExerciseComments = async (req, res) => {
  const { exerciseId } = req.params
  const response = await commentService.getExerciseComments(exerciseId)
  return res.status(201).json(response)
}

const toggleLikeComment = async (req, res) => {
  const userId = req.user.id
  const { commentId } = req.body
  const response = await commentService.toggleLikeComment(commentId, userId)
  return res.status(201).json(response)
}

const commentController = {
  toggleLikeComment,
  getExerciseComments,
  createComment
}

export default commentController
