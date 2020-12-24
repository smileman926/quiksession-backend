// make bluebird default Promise
Promise = require("bluebird"); // eslint-disable-line no-global-assign
const { port, env } = require("./config/vars");
const express = require("express");
const logger = require("./config/logger");
const app = require("./config/express");
const mongoose = require("./config/mongoose");

mongoose.connect();

const PORT = process.env.PORT || 5002;
console.log("PORT", PORT);
app.listen(PORT, () => logger.info(`server started on port ${port} (${env})`));

/**
 * Exports express
 * @public
 */

module.exports = app;
