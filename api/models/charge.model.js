const mongoose = require("mongoose");
const httpStatus = require("http-status");
const { omitBy, isNil } = require("lodash");
const APIError = require("../utils/APIError");
const Book = require("./book.model");

/**
 * charge Schema
 * @private
 */
const chargeSchema = new mongoose.Schema(
  {
    OwnerEmail: {
      type: String,
      require: true,
    },
    ArtistEmail: {
      type: String,
      require: true,
    },
    Credits: {
      type: Number,
      require: true,
    },
    Confirmed: {
      type: Boolean,
      require: true,
    },
    ConfirmationToken: {
      type: String,
      require: true,
    },
    BookId: {
      type: mongoose.Types.ObjectId,
      ref: "Book",
    }
  },
  {
    timestamps: true,
  }
);

/**
 * Methods
 */

chargeSchema.method({
  // Transform charge data for returning to the response
  transform() {
    const transformed = {};
    const fields = [
      "OwnerEmail",
      "ArtistEmail",
      "Credits",
      "Confirmed",
      "ConfirmationToken",
      "BookId",
      "createdAt",
    ];

    // Pick only necessary fields from charge schema
    fields.forEach((field) => {
      transformed[field] = this[field];
    });

    // Transform Owner object if exists
    if (this.BookId instanceof Book) {
      transformed["BookId"] = this.BookId.transform();
    }

    return transformed;
  },
});

/**
 * Statics
 */
chargeSchema.statics = {
  /**
   * Get charge
   *
   * @param {ObjectId} id - The objectId of charge.
   * @returns {Promise<charge, APIError>}
   */
  async get(id) {
    try {
      let charge;

      // Get charge with Id
      if (mongoose.Types.ObjectId.isValid(id)) {
        charge = await this.findById(id).exec();
      }
      if (charge) {
        return charge;
      }

      // Returns error if charge doesn't exist
      throw new APIError({
        message: "charge does not exist",
        status: httpStatus.NOT_FOUND,
      });
    } catch (error) {
      throw error;
    }
  },

  /**
   * List charges in descending order of 'createdAt' timestamp.
   *
   * @returns {Promise<charge[]>}
   */
  async list() {
    let match = {};

    // compose mongo aggregate to list charges
    try {
      let aggregate = [
        // {
        //   $lookup: {
        //     from: "studios",
        //     localField: "ProjectId",
        //     foreignField: "_id",
        //     as: "ProjectId",
        //   },
        // },
        // { $unwind: "$ProjectId" },
        {
          $project: {
            _id: 0,
            OwnerEmail: 1,
            ArtistEmail: 1,
            Credits: 1,
            Confirmed: 1,
            ConfirmationToken: 1,
            BookId: 1,
            createdAt: 1,
            // "ProjectId.id": "$ProjectId._id",
            // "ProjectId.name": 1,
          },
        },
        {
          $match: match,
        },
        { $sort: { createdAt: 1 } },
      ];

      let charges = await this.aggregate(aggregate);
      return charges;
    } catch (error) {
      throw error;
    }
  },
};

/**
 * @typedef charge
 */
module.exports = mongoose.model("charge", chargeSchema);
