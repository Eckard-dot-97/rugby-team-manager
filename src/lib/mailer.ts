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

export async function sendHouseholdInviteEmail(
  to: string,
  inviterName: string,
  householdLabel: string,
  acceptUrl: string
) {
  await transporter.sendMail({
    from: `"Team Sheet" <${process.env.GMAIL_USER}>`,
    to,
    subject: `${inviterName} invited you to join ${householdLabel} on Team Sheet`,
    html: `
      <p>${inviterName} has invited you to join <strong>${householdLabel}</strong> on Team Sheet, so you can help manage the children's schedules together.</p>
      <p><a href="${acceptUrl}">Click here to accept the invite</a> — this link expires in 7 days.</p>
      <p>If you don't already have an account, you'll be able to create one as part of accepting.</p>
      <p>If you weren't expecting this, you can safely ignore this email.</p>
    `,
  });
}
