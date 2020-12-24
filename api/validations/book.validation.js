const Joi = require("joi");
// const User = require("../models/user.model");

module.exports = {
  // POST /v1/books
  createBook: {
    body: {
      Subject: Joi.string().required(),
      StartTime: Joi.date().required(),
      EndTime: Joi.date().required(),
    },
  },

  // PATCH /v1/books/:bookId

  updateBook: {
    body: {
      Subject: Joi.string().required(),
      StartTime: Joi.date().required(),
      EndTime: Joi.date().required(),
    },
    params: {
      bookId: Joi.string().required(),
    },
  },
};
