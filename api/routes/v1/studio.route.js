const express = require("express");
const validate = require("express-validation");
const controller = require("../../controllers/studio.controller");
const { authorize } = require("../../middlewares/auth");
const { OWNER, ARTIST } = require("../../../helpers/role");
const router = express.Router();
const {
  createStudio,
  updateStudio,
} = require("../../validations/studio.validation");
/**
 * Load user when API with userId route parameter is hit
 */
router.param("studioId", controller.load);

// /studios - Returns the studios or create a studio
router
  .route("/")
  .get(controller.list)
  .post(authorize(OWNER), validate(createStudio), controller.create);

// /studios/:studioId - Returns a studio or modify or delete the studio
router
  .route("/:studioId")
  .get(authorize(), controller.get)
  .patch(authorize(OWNER), validate(updateStudio), controller.update)
  .delete(authorize(OWNER), controller.remove);

module.exports = router;
