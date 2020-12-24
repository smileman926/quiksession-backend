const keys = require("../../config/keys");
const stripe = require("stripe")('sk_test_kGxz7ahjlUEaY4tDcZjyzv6c');
const User = require("../models/user.model");
const Charge = require("../models/charge.model");
const crypto = require("crypto");
const { getCreditsFromCharge, sendConfirmationEmail, sendBookConfirmationEmail } = require("../utils/helper");

exports.chargeCredit = async (req, res, next) => {
  const { chargeToken, amount, email, isCharge2Artist, ownerEmail } = req.body;
  // console.log("chargeToken", chargeToken);
  const credits = getCreditsFromCharge(amount);
  const description = `$${amount} for ${credits} credits`;
  try {
    const resCharge = await stripe.charges.create({
      amount: amount * 100,
      currency: "usd",
      description: description,
      source: chargeToken.id,
    });
    console.log("charge", resCharge);
    if (resCharge.status === "succeeded") {
      if(isCharge2Artist) {
        const emailToken = crypto.randomBytes(64).toString("hex");
        const pwd = crypto.randomBytes(4).toString("hex");
        let isNewUser = true;
      
        const userData = {
          'email': email,
          'confirmed': false,
          'role': 'artist',
          'credit': credits,
          'name': email.slice(0, email.indexOf('@')),
          'password': pwd,
          'emailToken': emailToken,
        }
        var resUser;
        try {
          resUser = await new User(userData).save();
        }
        catch (e){
          resUser = await User.chargeCredit({ email, credits, emailToken });
          isNewUser = false;
        }
        const chargeData = {
          'OwnerEmail': ownerEmail,
          'ArtistEmail': email,
          'Credits': credits,
          'Confirmed': false,
          'ConfirmationToken': emailToken,
        }
        sendBookConfirmationEmail(resUser, emailToken, isNewUser, pwd);
        const nCharge = await new Charge(chargeData).save();
        console.log("resUser", resUser);
        return res.json({ status: "ok", data: resUser, chargeData: nCharge });
      }
      else {
        const resUser = await User.chargeCredit({ email, credits });
        console.log("email", email);
        console.log("resUser", resUser);
        return res.json({ status: "ok", data: resUser });
      // return resUser;
      }
    } else {
      return res.send({ status: "error", data: "api error" });
    }
  } catch (e) {
    return res.send({ status: "error", data: e.message });
  }
};