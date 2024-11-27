import { v2 as cloudinary } from 'cloudinary'
import multer from 'multer'
import { CloudinaryStorage } from 'multer-storage-cloudinary'

import env from '~/config/env'

cloudinary.config({
  cloud_name: env.CLOUDINARY_NAME,
  api_key: env.CLOUDINARY_KEY,
  api_secret: env.CLOUDINARY_SECRET
})

const storage = new CloudinaryStorage({
  cloudinary,
  allowedFormats: ['jpg', 'png'],
  params: {
    folder: 'english_is_easy'
  }
})

// can add configured for multer
const upload = multer({
  storage
})

export default upload
