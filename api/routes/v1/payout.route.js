const express = require("express");
const controller = require("../../controllers/payout.controller");

const router = express.Router();

router.route("/stripeSetup").post(controller.stripeSetup);
router.route("/stripeLink").post(controller.stripeLink);
router.route("/stripeBalance").post(controller.stripeBalance);
module.exports = router;
