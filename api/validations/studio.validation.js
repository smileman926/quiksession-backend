const Joi = require("joi");
// const User = require("../models/user.model");

module.exports = {
  // POST /v1/studios
  createStudio: {
    body: {
      name: Joi.string().required(),
      address: Joi.string().required(),
      phoneNumber: Joi.number().required(),
    },
  },

  // PATCH /v1/studios/:studioId
  updateStudio: {
    body: {
      name: Joi.string(),
      address: Joi.string(),
      phoneNumber: Joi.number(),
    },
    params: {
      studioId: Joi.string()
        .regex(/^[a-fA-F0-9]{24}$/)
        .required(),
    },
  },
};
