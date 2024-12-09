import passport from 'passport'
import { ExtractJwt, Strategy as JwtStrategy } from 'passport-jwt'

import env from '~/config/env'
import userModel from '~/models/userModel'

// JWT Strategy: Xác thực các request với JWT token
const opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: env.TOKEN_SECRET
}

passport.use(
  'passport-jwt',
  new JwtStrategy(opts, async (jwt_payload, done) => {
    try {
      const user = await userModel.findById(jwt_payload.id)
      if (!user) return done(null, false)

      // Nếu người dùng bị khóa thì xem như token đã hết hạn
      if (user.lock?.isLock) {
        return done(null, false)
      }

      return done(null, user)
    } catch (err) {
      return done(err, false)
    }
  })
)
