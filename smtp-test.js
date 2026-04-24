const nodemailer = require("nodemailer");
require("dotenv").config();

const t = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true",
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

console.log("Testing SMTP login for:", process.env.SMTP_USER);
console.log("Host:", process.env.SMTP_HOST, "Port:", process.env.SMTP_PORT);

t.verify((err, success) => {
  if (err) {
    console.error("FAIL:", err.message);
    if (err.message.includes("535")) {
      console.error("\n>>> GoDaddy is rejecting your credentials.");
      console.error(">>> Either the password is wrong, SMTP AUTH is disabled on mailbox, or 2FA requires app password.");
    }
    process.exit(1);
  } else {
    console.log("SUCCESS: SMTP login works!");
    process.exit(0);
  }
});
