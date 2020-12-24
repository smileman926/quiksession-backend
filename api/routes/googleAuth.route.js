const passport = require("passport");

/**
 * Import into the index.js and immediately call
 * require("./routes/authRoutes")(app)
 */
module.exports = (app) => {
  app.get(
    "/auth/google",
    passport.authenticate("google", {
      scope: ["profile", "email"],
      accessType: "offline",
      prompt: "consent",
    })
  );

  app.get(
    "/auth/google/callback",
    passport.authenticate("google"),

    (req, res) => {
      res.redirect(`/login?valid=${JSON.stringify(req.user)}`);
    }
  );
};
