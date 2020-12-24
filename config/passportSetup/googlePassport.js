const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const moment = require("moment-timezone");
const { jwtExpirationInterval } = require("../../config/vars");
const keys = require("../keys");
const mongoose = require("mongoose");
const RefreshToken = require("../../api/models/refreshToken.model");
/**
 * So instead of module.exports = mongoose.model("users", userSchema);
 * from /model/User.js
 * and then
 * const User = require("../models/user");
 */
const User = require("../../api/models/user.model");

// call with the user to generate identifying piece of info aka SetCookie
passport.serializeUser((user, done) => {
  /**
   * the first parameter of done is the error object which is null
   * the second parameter is the mongo database id
   */
  done(null, user);
});

// pass the identifying piece of user info to turn it into a user aka this is the Cookie
passport.deserializeUser((user, done) => {
  done(null, user);
});

// Immediately run this method in index.js with require("./services/passport");

var strategy = new GoogleStrategy(
  {
    clientID: keys.googleClientID,
    clientSecret: keys.googleClientSecret,
    callbackURL: "/auth/google/callback",
    proxy: true,
  },
  async (accessToken, refreshToken, profile, done) => {
    const expiresIn = moment().add(jwtExpirationInterval, "minutes");
    const existingUser = await User.findOne({
      email: profile.emails[0].value,
    });
    if (existingUser) {
      const refreshToken = RefreshToken.generate(existingUser).token;
      const accessToken = existingUser.token();
      const auth = {
        token: {
          accessToken,
          refreshToken,
          expiresIn,
        },
        user: existingUser,
      };
      done(null, auth);
    } else {
      const newUser = {
        name: profile.displayName,
        googleId: profile.id,
        email: profile.emails[0].value,
        password: "password",
        role: "artist",
        credit: 0,
        confirmed: true,
      };
      await new User(newUser).save();
      const existingNewUser = await User.findOne({
        email: profile.emails[0].value,
      });

      const refreshToken = RefreshToken.generate(existingNewUser).token;
      const accessToken = existingNewUser.token();
      const auth = {
        token: {
          accessToken,
          refreshToken,
          expiresIn,
        },
        user: newUser,
      };
      done(null, auth);
    }
  }
);
passport.use(strategy);
