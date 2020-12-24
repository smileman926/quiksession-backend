const { chargeCredit } = require("../controllers/user.controller");

module.exports = (app) => {
  app.post("/api/stripe", chargeCredit);
};
