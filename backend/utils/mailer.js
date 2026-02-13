const nodemailer = require("nodemailer");

let transporter;

function getTransporter() {
  if (transporter) return transporter;

  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    console.warn("⚠️ SMTP credentials not configured. Email functionality disabled.");
    return null;
  }

  try {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user,
        pass
      }
    });
    console.log("✅ SMTP transporter configured successfully");
  } catch (error) {
    console.error("❌ Failed to create SMTP transporter:", error.message);
    return null;
  }

  return transporter;
}

async function sendOtpEmail({ to, otp, purpose }) {
  const t = getTransporter();
  
  if (!t) {
    console.warn(`⚠️ Cannot send OTP to ${to} - SMTP not configured`);
    console.log(`🔑 Development OTP for ${to}: ${otp}`);
    return { success: false, message: "SMTP not configured" };
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const appName = process.env.APP_NAME || "Voting System";

  const subject =
    purpose === "PASSWORD_RESET"
      ? `${appName} - Password Reset OTP`
      : `${appName} - Email Verification OTP`;

  const text =
    purpose === "PASSWORD_RESET"
      ? `Your password reset OTP is: ${otp}. It expires in 10 minutes.`
      : `Your email verification OTP is: ${otp}. It expires in 10 minutes.`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5">
      <h2 style="margin: 0 0 12px 0">${subject}</h2>
      <p style="margin: 0 0 8px 0">Use this OTP to continue:</p>
      <div style="font-size: 24px; font-weight: 700; letter-spacing: 4px; margin: 12px 0">${otp}</div>
      <p style="margin: 0">This OTP expires in <b>10 minutes</b>.</p>
    </div>
  `;

  try {
    await t.sendMail({ from, to, subject, text, html });
    console.log(`✅ OTP email sent to ${to}`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Failed to send OTP email to ${to}:`, error.message);
    console.log(`🔑 Development OTP for ${to}: ${otp}`);
    return { success: false, message: error.message };
  }
}

module.exports = {
  sendOtpEmail
};
