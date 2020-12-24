const mongoose = require("mongoose");
const httpStatus = require("http-status");
const { omitBy, isNil } = require("lodash");
const bcrypt = require("bcryptjs");
const moment = require("moment-timezone");
const jwt = require("jwt-simple");
const uuidv4 = require("uuid/v4");
const APIError = require("../utils/APIError");
const { env, jwtSecret, jwtExpirationInterval } = require("../../config/vars");

/**
 * User Roles
 */
const roles = ["owner", "artist"];

/**
 * User Schema
 * @private
 */
const userSchema = new mongoose.Schema(
  {
    googleId: String,
    name: {
      type: String,
      maxlength: 128,
      index: true,
      trim: true,
    },
    userPhoto: {
      type: String
    },
    email: {
      type: String,
      match: /^\S+@\S+\.\S+$/,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: roles,
      default: "artist",
      required: true,
    },

    stripeId: {
      type: String,
      default: "",
    },
    confirmed: {
      type: Boolean,
      default: false,
    },

    emailToken: {
      type: String,
      default: "",
    },

    credit: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Add your
 * - pre-save hooks
 * - validations
 * - virtuals
 */
userSchema.pre("save", async function save(next) {
  try {
    // We don't encrypt password if password fields is not modified.
    if (!this.isModified("password")) return next();

    const rounds = env === "test" ? 1 : 10;

    // Encrypt password using bcrypt
    const hash = await bcrypt.hash(this.password, rounds);
    this.password = hash;

    return next();
  } catch (error) {
    return next(error);
  }
});

/**
 * Methods
 */
userSchema.method({
  // Transform user data for returning to the response
  transform() {
    const transformed = {};
    const fields = [
      "_id",
      "id",
      "name",
      "email",
      "password",
      "role",
      "stripeId",
      "confirmed",
      "emailToken",
      "credit",
      "createdAt",
      "userPhoto"
    ];

    fields.forEach((field) => {
      transformed[field] = this[field];
    });

    return transformed;
  },

  // Generate JWT Token from user id
  token() {
    const playload = {
      exp: moment().add(jwtExpirationInterval, "minutes").unix(),
      iat: moment().unix(),
      sub: this._id,
    };
    return jwt.encode(playload, jwtSecret);
  },

  // Compare to check if raw password matches encrypted password
  async passwordMatches(password) {
    return bcrypt.compare(password, this.password);
  },
});

/**
 * Statics
 */
userSchema.statics = {
  roles,

  /**
   * Get user
   *
   * @param {ObjectId} id - The objectId of user.
   * @returns {Promise<User, APIError>}
   */
  async get(id) {
    try {
      let user;

      // Find user by user id
      if (mongoose.Types.ObjectId.isValid(id)) {
        user = await this.findById(id).exec();
      }
      if (user) {
        return user;
      }

      // Throws API error if user does not exist
      throw new APIError({
        message: "User does not exist",
        status: httpStatus.NOT_FOUND,
      });
    } catch (error) {
      throw error;
    }
  },

  /**
   * Find user by email and tries to generate a JWT token
   *
   * @param {ObjectId} id - The objectId of user.
   * @returns {Promise<User, APIError>}
   */
  async findAndGenerateToken(options) {
    const { email, password, refreshObject } = options;
    if (!email)
      throw new APIError({
        message: "An email is required to generate a token",
      });

    // Find user by email
    const user = await this.findOne({ email }).exec();
    if (!user.confirmed) {
      throw new APIError({
        message: "Please Confirm your email to login",
      });
    }
    const err = {
      status: httpStatus.UNAUTHORIZED,
      isPublic: true,
    };

    // If password field exists check if password matches and generate token
    if (password) {
      if (user && (await user.passwordMatches(password))) {
        return { user, accessToken: user.token() };
      }
      err.message = "Incorrect email or password";
    } else if (refreshObject && refreshObject.userEmail === email) {
      // if refresh token exists, generate token from refresh token
      if (moment(refreshObject.expires).isBefore()) {
        err.message = "Invalid refresh token.";
      } else {
        return { user, accessToken: user.token() };
      }
    } else {
      err.message = "Incorrect email or refreshToken";
    }
    throw new APIError(err);
  },

  /**
   * List users in descending order of 'createdAt' timestamp.
   *
   * @param {number} skip - Number of users to be skipped.
   * @param {number} limit - Limit number of users to be returned.
   * @returns {Promise<User[]>}
   */
  async list({ page = 1, perPage = 10, keyword }) {
    const options = {};

    // if keyword exists, find by name, email and role using keyword
    if (keyword && keyword.length > 0) {
      options["$or"] = [
        {
          name: RegExp(keyword, "i"),
        },
        {
          email: RegExp(keyword, "i"),
        },
        {
          role: RegExp(keyword, "i"),
        },
      ];
    }

    try {
      // Get users from database
      let users = await this.find(options)
        .sort({ createdAt: -1 })
        .skip(perPage * (page - 1))
        .limit(perPage)
        .exec();
      users = users.map((user) => user.transform());

      return users;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Return new validation error
   * if error is a mongoose duplicate key error
   *
   * @param {Error} error
   * @returns {Error|APIError}
   */
  checkDuplicateEmail(error) {
    // If there is error, check if error is due to email duplicate of mongodb
    if (error.name === "MongoError" && error.code === 11000) {
      return new APIError({
        message: '"email" already exists',
        errors: [
          {
            field: "email",
            location: "body",
            messages: ['"email" already exists'],
          },
        ],
        status: httpStatus.CONFLICT,
        isPublic: true,
        stack: error.stack,
      });
    }
    return error;
  },

  /**
   * Return new validation error
   * if error is a mongoose duplicate key error
   *
   * @param {Error} error
   * @returns {Error|APIError}
   */
  async chargeCredit(params) {
    const { email, credits } = params;
    // If there is error, check if error is due to email duplicate of mongodb
    const query = { email: email };
    const newData = { $inc: { credit: credits } };
    const options = { upsert: true };
    // const callbackFn = function (err, res) {
    //   if (err) return { status: "error", data: err.message };
    //   return { status: "ok", data: res };
    // };

    try {
      // Get users from database
      let resUser = await this.findOneAndUpdate(
        query,
        newData,
        options
        // callbackFn
      );

      // this.save();
      return resUser;
    } catch (e) {
      return { status: "error", data: e.message };
    }
  },
};

/**
 * @typedef User
 */
module.exports = mongoose.model("User", userSchema);
