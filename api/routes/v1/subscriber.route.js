const express = require("express");
const validate = require("express-validation");
const controller = require("../../controllers/subscriber.controller");
const { authorize } = require("../../middlewares/auth");
// const { OWNER, ARTIST } = require("../../../helpers/role");
const router = express.Router();

// /studios - Returns the studios or create a studio
router
  .route("/")
  .get(authorize(), controller.list)
  .post(authorize(), controller.create);

module.exports = router;
