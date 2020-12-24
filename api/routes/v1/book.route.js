const express = require("express");
const validate = require("express-validation");
const controller = require("../../controllers/book.controller");
const { authorize } = require("../../middlewares/auth");
const { OWNER, ARTIST } = require("../../../helpers/role");
const router = express.Router();
const { createBook, updateBook } = require("../../validations/book.validation");
/**
 * Load user when API with userId route parameter is hit
 */
router.param("bookId", controller.load);

// /books - Returns the books or create a book
router
  .route("/")
  .get(authorize(), controller.list)
  .post(authorize(OWNER), validate(createBook), controller.create);

router.route('/booked').post(authorize(), controller.createBooked);

// /books/:bookId - Returns a book or modify or delete the book
router
  .route("/:bookId")
  .get(authorize(), controller.get)
  .patch(authorize(OWNER), validate(updateBook), controller.update)
  .delete(authorize(OWNER), controller.remove);

module.exports = router;
