const express = require("express");
const validate = require("express-validation");
const controller = require("../../controllers/auth.controller");
const oAuthLogin = require("../../middlewares/auth").oAuth;

const {
  login,
  register,
  forgetPassword,
  refresh,
} = require("../../validations/auth.validation");

const router = express.Router();

router.route("/register").post(validate(register), controller.register);
router.route("/login").post(validate(login), controller.login);
router
  .route("/forgetPassword")
  .post(validate(forgetPassword), controller.forgetPassword);
router.route("/updatePassword").post(controller.updatePassword);
router.route("/refresh-token").post(validate(refresh), controller.refresh);
router.route("/confirmation/:token").get(controller.confirmation);
router.route("/resetPassword/:token").get(controller.resetPassword);
module.exports = router;
