const User = require("../models/user.model");
const fetch = require("node-fetch");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

let makeStripeConnectRequest = async (code) => {
  let clientId = process.env.STRIPE_CLIENT_ID;
  let secretKey = process.env.STRIPE_SECRET_KEY;

  let params = {
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: secretKey,
    code: code,
  };

  let url = "https://connect.stripe.com/oauth/token";

  return await fetch(url, {
    method: "POST",
    body: JSON.stringify(params),
    headers: { "Content-Type": "application/json" },
  })
    .then((res) => res.json())
    .catch((err) => {
      return next(err);
    });
};

/**
 * Save stripe user id in database
 * @public
 */
exports.stripeSetup = async (req, res, next) => {
  try {
    const { code, userId } = req.body;
    // 1) Post the authorization code to Stripe to complete the Express onboarding flow
    let stripeConnectRequest = await makeStripeConnectRequest(code);

    // 2) Update User account with StripeUserId
    let stripeUserId = stripeConnectRequest.stripe_user_id;

    if (!stripeUserId) {
      return res.status(400).json({ msg: "Connect request to Stripe failed" });
    }

    await User.findOne({ _id: userId }, (err, user) => {
      if (err || !user) {
        return res
          .status(400)
          .json({ error: "User with this email does not exist." });
      }
      user["stripeId"] = stripeUserId;
      user.save();
      return res.json({ status: "ok" });
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Save stripe user id in database
 * @public
 */
exports.stripeLink = async (req, res, next) => {
  try {
    const { userId } = req.body;
    await User.findOne({ _id: userId }, async (err, user) => {
      if (err || !user.stripeId) {
        return res.status(400).json({ error: "No stripe account found." });
      }

      let stripeUserId = user.stripeId;
      try {
        let stripeReq = await stripe.accounts.createLoginLink(stripeUserId);
        return res.json(stripeReq);
      } catch (err) {
        return res
          .status(400)
          .json({ error: "Failed to create a Stripe login link." });
      }
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Get stripe balance amount
 * @public
 */
exports.stripeBalance = async (req, res, next) => {
  try {
    const { userId } = req.body;

    await User.findOne({ _id: userId }, async (err, user) => {
      if (err || !user.stripeId) {
        return res.status(400).json({ error: "No stripe account found." });
      }

      let stripeUserId = user.stripeId;

      let stripeReq = await stripe.balance.retrieve({
        stripeAccount: stripeUserId,
      });

      let availableBalance = stripeReq.available ? stripeReq.available[0] : {};

      if (
        stripeReq.pending &&
        stripeReq.pending[0] &&
        stripeReq.pending[0].currency == availableBalance.currency
      ) {
        availableBalance.amount += stripeReq.pending[0].amount;
      }
      return res.json(availableBalance);
    });
  } catch (error) {
    return next(error);
  }
};
