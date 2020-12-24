const express = require("express");
const mongoose = require("mongoose");
const cookieSession = require("cookie-session");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const compress = require("compression");
const methodOverride = require("method-override");
const cors = require("cors");
const helmet = require("helmet");
const passport = require("passport");
const routes = require("../api/routes/v1");
const { logs } = require("./vars");
const strategies = require("./passportSetup/jwtPassport");
const error = require("../api/middlewares/error");
const fileUpload = require("express-fileupload");

require("dotenv").config();
const keys = require("./keys");

/**
 * Express instance
 * @public
 */
const app = express();

// request logging. dev: console | production: file
app.use(morgan(logs));

// parse body params and attache them to req.body
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// gzip compression
app.use(compress());

// lets you use HTTP verbs such as PUT or DELETE
// in places where the client doesn't support it
app.use(methodOverride());

// secure apps by setting various HTTP headers
app.use(helmet());

// enable CORS - Cross Origin Resource Sharing
app.use(cors());

// enable file upload
app.use(fileUpload());

// enable authentication
app.use(passport.initialize());
passport.use("jwt", strategies.jwt);

// mount api v1 routes
app.use("/v1", routes);

// declare the user model before it is used in passport.js
require("../api/models/user.model");

// execute the /services/passport.js file
require("./passportSetup/googlePassport");

app.use(express.json());
app.use(
  /**
   * Take data from a cookie and assigns it to req.session
   *
   */
  cookieSession({
    /**
     * maxAge property is how long this cookie
     * can exist inside the browser before it is automatically expired.
     * The value below represents 30 days
     */
    maxAge: 30 * 24 * 60 * 60 * 1000,
    /**
     * The keys property is used to encrypt the Cookie
     */
    keys: [keys.cookieKey],
  })
);
// The next two call are for passport authentication
app.use(passport.initialize());
app.use(passport.session());

// Return the function from authRoutes and immediately execute it
require("../api/routes/googleAuth.route")(app);
require("../api/routes/billing.route")(app);

// listen to requests
if (process.env.NODE_ENV === "production") {
  // Express will serve up production assets
  // like our main.js file, or main.css file!
  const path = require("path");
  app.use(express.static(path.join(__dirname, "/../../client/build")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "/../../client/build", "index.html"));
  });
}

// if error is not an instanceOf APIError, convert it.
app.use(error.converter);

// catch 404 and forward to error handler
app.use(error.notFound);

// error handler, send stacktrace only during development
app.use(error.handler);

module.exports = app;
