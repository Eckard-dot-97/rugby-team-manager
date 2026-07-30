import nodemailer from "nodemailer";

// Requires a Gmail App Password (not your normal Gmail password) —
// generate one at myaccount.google.com/apppasswords after enabling 2FA.
export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  await transporter.sendMail({
    from: `"Team Sheet" <${process.env.GMAIL_USER}>`,
    to,
    subject: "Reset your Team Sheet password",
    html: `
      <p>Someone requested a password reset for this account.</p>
      <p><a href="${resetUrl}">Click here to reset your password</a> — this link expires in 1 hour.</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
  });
}
