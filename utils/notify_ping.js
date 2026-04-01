// notify_ping.js
// Save to: C:\AuditDNA\backend\utils\notify_ping.js
// AND to:  C:\AuditDNA\auditdna-realestate\backend\utils\notify_ping.js

const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtpout.secureserver.net",
  port: 465,
  secure: true,
  auth: {
    user: "saul@mexausafg.com",
    pass: "KongKing#321",
  },
});

async function pingRegistration({ platform, name, email, company, origin, docs, extra }) {
  const timestamp = new Date().toLocaleString("en-US", {
    timeZone: "America/Tijuana",
    dateStyle: "medium",
    timeStyle: "short",
  });

  const docList = docs && docs.length
    ? docs.map((d) => `  - ${d}`).join("\n")
    : "  No documents listed";

  const extraBlock = extra
    ? `\nAdditional Info:\n${Object.entries(extra).map(([k, v]) => `  ${k}: ${v}`).join("\n")}`
    : "";

  const subject = `[${platform}] New Registration — ${name || email}`;

  const text = `
NEW REGISTRATION — ${platform.toUpperCase()}
${"=".repeat(44)}

Name:     ${name || "N/A"}
Email:    ${email || "N/A"}
Company:  ${company || "N/A"}
Origin:   ${origin || "N/A"}
Time:     ${timestamp}

Legal / Document Checklist:
${docList}
${extraBlock}

--- AuditDNA Notification System ---
`.trim();

  try {
    await transporter.sendMail({
      from: '"AuditDNA Alerts" <saul@mexausafg.com>',
      to: "saul@mexausafg.com",
      subject,
      text,
    });
    console.log(`[notify_ping] Registration ping sent for ${email}`);
  } catch (err) {
    console.error("[notify_ping] Failed to send ping:", err.message);
  }
}

module.exports = { pingRegistration };