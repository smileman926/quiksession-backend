const mongoose = require("mongoose");
const logger = require("./../config/logger");
const { mongo, env } = require("./vars");
const User = require("../api/models/user.model");

// set mongoose Promise to Bluebird
mongoose.Promise = Promise;

// Exit application on error
mongoose.connection.on("error", (err) => {
  logger.error(`MongoDB connection error: ${err}`);
  process.exit(-1);
});

exports.connect = () => {
  mongoose
    .connect(mongo.uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
      useFindAndModify: false,
    })
    .then(() => console.log("DB connected"));

  return mongoose.connection;
};
