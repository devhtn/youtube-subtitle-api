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
      if (user) {
        return done(null, user)
      } else {
        return done(null, false)
      }
    } catch (err) {
      return done(err, false)
    }
  })
)
