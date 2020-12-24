const nodemailer = require("nodemailer");

const creditRating = 1;
function getCreditsFromCharge(charge) {
  const credits = charge / creditRating;
  return credits;
};

function sendConfirmationEmail(user, emailToken) {
  let transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    secure: true,
    // here it goes
    tls: { rejectUnauthorized: false },
    debug: true,
  });

  const url = `${process.env.DOMAIN}/v1/confirmation/${emailToken}`;
  let mailOptions = {
    from: "info@quiksession.com",
    to: `${user.name} <${user.email}>`,
    subject: "Confirmation Email",
    html: `<h2>Please Confirm Your Email</h2>
           <a href=${url}>${url}</a>`,
  };
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return console.log(error);
    }
    console.log(info.messageId);
  });
}

function sendBookConfirmationEmail(user, confirmationToken, isNewUser, nPwd) {
  let transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    secure: true,
    // here it goes
    tls: { rejectUnauthorized: false },
    debug: true,
  });

  let content = "Booking Confirmation Email";

  if( isNewUser ) {
    content = "We created your account and the password is '" + nPwd + "'<br/>" + content;
  }

  const url = `${process.env.DOMAIN}/v1/confirmation/${confirmationToken}`;
  let mailOptions = {
    from: "info@quiksession.com",
    to: `${user.name} <${user.email}>`,
    subject: "Booking Confirmation Email",
    html: `<h2>` + content + `</h2>
           <a href=${url}>${url}</a>`,
  };
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return console.log(error);
    }
    console.log(info.messageId);
  });
}

module.exports.sendConfirmationEmail = sendConfirmationEmail;
module.exports.sendBookConfirmationEmail = sendBookConfirmationEmail;
module.exports.getCreditsFromCharge = getCreditsFromCharge;