const mongoose = require("mongoose");
const httpStatus = require("http-status");
const { omitBy, isNil } = require("lodash");
const APIError = require("../utils/APIError");
const Studio = require("./studio.model");

/**
 * Book Schema
 * @private
 */
const bookSchema = new mongoose.Schema(
  {
    Id: {
      type: String,
      require: true,
    },
    ArtistId: {
      type: mongoose.Types.ObjectId,
    },
    Subject: {
      type: String,
      require: true,
      default: "Not available",
    },
    TaskId: {
      type: String,
      require: true,
    },
    IsAllDay: {
      type: Boolean,
      require: true,
    },
    BookStatus: {
      type: String,
    },
    StartTime: { type: Date, default: Date.now },
    EndTime: { type: Date, default: Date.now },
    ProjectId: {
      type: mongoose.Types.ObjectId,
      ref: "Studio",
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Methods
 */

bookSchema.method({
  // Transform Book data for returning to the response
  transform() {
    const transformed = {};
    const fields = [
      "_id",
      "Id",
      "ArtistId",
      "Subject",
      "TaskId",
      "IsAllDay",
      "BookStatus",
      "StartTime",
      "EndTime",
      "createdAt",
    ];

    // Pick only necessary fields from Book schema
    fields.forEach((field) => {
      transformed[field] = this[field];
    });

    // Transform projectId object if exists
    if (this.ProjectId instanceof Studio) {
      transformed["ProjectId"] = this.ProjectId.transform();
    }
    return transformed;
  },
});

/**
 * Statics
 */
bookSchema.statics = {
  /**
   * Get book
   *
   * @param {ObjectId} id - The objectId of book.
   * @returns {Promise<Book, APIError>}
   */
  async get(id) {
    try {
      let book;

      // Get book with Id
      if (mongoose.Types.ObjectId.isValid(id)) {
        book = await this.findById(id).populate("ProjectId");
      }
      if (book) {
        return book;
      }

      // Returns error if book doesn't exist
      throw new APIError({
        message: "Book does not exist",
        status: httpStatus.NOT_FOUND,
      });
    } catch (error) {
      throw error;
    }
  },

  /**
   * List books in descending order of 'createdAt' timestamp.
   *
   * @returns {Promise<Book[]>}
   */
  async list(query) {
    var pdate = new Date(query.date);
    var edate = new Date(query.date);
    edate.setDate(edate.getDate() + 1);
    let match = query.TaskId
      ? {
          TaskId: query.TaskId,
          StartTime: {
            $lte: edate,
          },
          EndTime: {
            $gte: pdate,
          },
        }
      : {};

    // compose mongo aggregate to list books
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
            _id: 1,
            Id: 1,
            ArtistId: 1,
            Subject: 1,
            TaskId: 1,
            IsAllDay: 1,
            BookStatus: 1,
            StartTime: 1,
            EndTime: 1,
            ProjectId: 1,
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

      let books = await this.aggregate(aggregate);
      return books;
    } catch (error) {
      console.log(error);
      throw error;
    }
  },
};

/**
 * @typedef Book
 */
module.exports = mongoose.model("Book", bookSchema);
