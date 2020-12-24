const mongoose = require("mongoose");
const httpStatus = require("http-status");
const { omitBy, isNil } = require("lodash");
const APIError = require("../utils/APIError");
const User = require("./user.model");

/**
 * Subscriber Schema
 * @private
 */
const subscriberSchema = new mongoose.Schema(
  {
    playerId: {
      type: String,
      require: true,
    },
    owner: {
      type: mongoose.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Methods
 */
subscriberSchema.method({
  transform() {
    const transformed = {};
    const fields = ["id", "playerId", "createdAt"];

    // Pick only necessary fields from Subscriber schema
    fields.forEach((field) => {
      transformed[field] = this[field];
    });

    // Transform Owner object if exists
    if (this.owner instanceof User) {
      transformed["owner"] = this.owner.transform();
    }
    return transformed;
  },
});

/**
 * Statics
 */
subscriberSchema.statics = {
  /**
   * Get subscriber
   *
   * @param {ObjectId} id - The objectId of subscriber.
   * @returns {Promise<Subscirber, APIError>}
   */
  async get(id) {
    try {
      let subscriber;

      // Get subscriber with subscriberId
      if (mongoose.Types.ObjectId.isValid(id)) {
        subscriber = await this.findById(id).populate("owner");
      }
      if (subscriber) {
        return subscriber;
      }

      // Returns error if subscriber doesn't exist
      throw new APIError({
        message: "subscriber does not exist",
        status: httpStatus.NOT_FOUND,
      });
    } catch (error) {
      throw error;
    }
  },

  /**
   * List subscribers in descending order of 'createdAt' timestamp.
   *
   * @returns {Promise<Subscriber[]>}
   */
  async list() {
    // compose mongo aggregate to list subscribers
    try {
      let aggregate = [
        {
          $lookup: {
            from: "users",
            localField: "owner",
            foreignField: "_id",
            as: "owner",
          },
        },
        { $unwind: "$owner" },
        {
          $project: {
            _id: 0,
            id: "$_id",
            playerId: 1,
            createdAt: 1,
            "owner.id": "$owner._id",
          },
        },
        { $sort: { createdAt: 1 } },
      ];
      let subscribers = await this.aggregate(aggregate);
      return subscribers;
    } catch (error) {
      console.log("error", error);
      throw error;
    }
  },
};

/**
 * @typedef Subscriber
 */
module.exports = mongoose.model("Subscriber", subscriberSchema);
