const express = require("express");
const authRoutes = require("./auth.route");
const studioRoutes = require("./studio.route");
const payoutRoutes = require("./payout.route");
const bookRoutes = require("./book.route");
const subscriberRoutes = require("./subscriber.route");
const router = express.Router();

router.use("/", authRoutes);
router.use("/studios", studioRoutes);
router.use("/payouts", payoutRoutes);
router.use("/books", bookRoutes);
router.use("/subscribers", subscriberRoutes);

module.exports = router;
