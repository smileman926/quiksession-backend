const User = require("../models/user.model");
const Charge = require("../models/charge.model");
const Book = require("../models/book.model");
const Studio = require("../models/studio.model");
const RefreshToken = require("../models/refreshToken.model");
const moment = require("moment-timezone");
const { jwtExpirationInterval } = require("../../config/vars");
const querystring = require("querystring");
const crypto = require("crypto");
const uuidv4 = require("uuid").v4;
const { sendConfirmationEmail } = require("../utils/helper");
const nodemailer = require("nodemailer");

function sendResetPasswordEmail(user, emailToken) {
  let transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    secure: true,
    // here it goes
    tls: { rejectUnauthorized: false },
    debug: true,
  });

  const url = `${process.env.DOMAIN}/v1/resetPassword/${emailToken}`;
  let mailOptions = {
    from: "info@quiksession.com",
    to: `${user.name} <${user.email}>`,
    subject: "Confirmation Email",
    html: `<h2>Please click on given link to reset your password</h2>
           <a href=${url}>${url}</a>`,
  };
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return console.log(error);
    }
    console.log(info.messageId);
  });
}

/**
 * Returns a formatted object with tokens
 * @private
 */
function generateTokenResponse(user, accessToken) {
  const refreshToken = RefreshToken.generate(user).token;
  const expiresIn = moment().add(jwtExpirationInterval, "minutes");
  return {
    accessToken,
    refreshToken,
    expiresIn,
  };
}
/**
 * Returns jwt token if valid username and password is provided
 * @public
 */
exports.login = async (req, res, next) => {
  console.log("request received..");
  try {
    const { user, accessToken } = await User.findAndGenerateToken(req.body);
    const token = generateTokenResponse(user, accessToken);
    const userTransformed = user.transform();
    return res.json({ token, user: userTransformed });
  } catch (error) {
    return next(error);
  }
};

/**
 * Sends comfirmation Email
 * @public
 */
exports.register = async (req, res, next) => {
  try {
    const userData = req.body;
    console.log("UserData =====", userData);
    const emailToken = crypto.randomBytes(64).toString("hex");
    userData["emailToken"] = emailToken;
    const user = await new User(userData).save();
    sendConfirmationEmail(user, emailToken);

    const state = uuidv4();

    let stripeConnectParams = {
      response_type: "code",
      scope: "read_write",
      state,
      client_id: process.env.STRIPE_CLIENT_ID,
    };

    let reqQuery = querystring.stringify(stripeConnectParams);

    const url = `https://connect.stripe.com/express/oauth/authorize?${reqQuery}`;

    return res.send({ url, role: user.role, userId: user._id });
  } catch (error) {
    return next(User.checkDuplicateEmail(error));
  }
};

/**
 * Set New Password
 * @public
 */

exports.updatePassword = async (req, res, next) => {
  try {
    const userId = req.body.userId;
    const password = req.body.newPassword;
    await User.findOne({ _id: userId }, (err, user) => {
      if (err || !user) {
        return res
          .status(400)
          .json({ error: "User with this email does not exist." });
      }
      user["password"] = password;
      user.save();
      return res.json({ success: true });
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Delete the password token in DB
 * @public
 */

exports.resetPassword = async (req, res, next) => {
  try {
    const token = req.params.token;
    await User.findOne({ emailToken: token }, (err, user) => {
      if (err || !user) {
        return res
          .status(400)
          .json({ error: "User with this email does not exist." });
      }

      user["emailToken"] = "";
      user.save();
      return res.redirect(`${process.env.DOMAIN}/resetPassword/${user._id}`);
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Updates email confirmation status, delete token in db and redirect to login page
 * @public
 */

exports.confirmation = async (req, res, next) => {
  try {
    const token = req.params.token;
    await User.update(
      { emailToken: token },
      { $set: { confirmed: true, emailToken: "" } }
    );
    Charge.findOne({ ConfirmationToken: token }, async (err, c_res) => {
      if (err || !c_res) {
        return res.redirect(`${process.env.DOMAIN}/login`);
      }
      var n = new Date();
      var c_date = new Date(c_res.createdAt);
      var diff = (n - c_date) / (1000 * 60 * 60);
      if (diff <= 24) {
        var book = await Book.findById( c_res.BookId );
        if( book != null ) {
          var studio = await Studio.findById(book.ProjectId);
          console.log(studio);
          await User.findOneAndUpdate({email: c_res.ArtistEmail}, {$inc: {credit: -studio.price}});
          await User.findOneAndUpdate({email: c_res.OwnerEmail}, {$inc: {credit: studio.price}});
        }
        c_res.Confirmed = true;
      }
      c_res.ConfirmationToken = "";
      c_res.save();
      await Book.findOneAndUpdate(
        { _id: c_res.BookId },
        { BookStatus: "Booked" }
      );
      return res.redirect(`${process.env.DOMAIN}/login`);
    });
    // await Charge.update(
    //   {}
    // )
  } catch (error) {
    return next(error);
  }
};

/**
 * Sends Reset Password Email
 * @public
 */
exports.forgetPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    await User.findOne({ email }, (err, user) => {
      if (err || !user) {
        return res
          .status(400)
          .json({ error: "User with this email does not exist." });
      }
      const emailToken = crypto.randomBytes(64).toString("hex");
      user["emailToken"] = emailToken;
      user.save();
      sendResetPasswordEmail(user, emailToken);
      return res.json({ success: true });
    });
  } catch (error) {
    return next(User.checkDuplicateEmail(error));
  }
};

/**
 * Returns a new jwt when given a valid refresh token
 * @public
 */
exports.refresh = async (req, res, next) => {
  try {
    const { email, refreshToken } = req.body;
    const refreshObject = await RefreshToken.findOneAndRemove({
      userEmail: email,
      token: refreshToken,
    });
    const { user, accessToken } = await User.findAndGenerateToken({
      email,
      refreshObject,
    });
    const response = generateTokenResponse(user, accessToken);
    return res.json(response);
  } catch (error) {
    return next(error);
  }
};
