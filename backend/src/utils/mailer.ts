import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true', // true for port 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendOTPEmail(to: string, otp: string, purpose: 'verification' | 'password_reset') {
  const subject =
    purpose === 'password_reset' ? 'Your Password Reset OTP' : 'Verify Your Email';

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:auto">
      <h2>${purpose === 'password_reset' ? 'Reset Your Password' : 'Email Verification'}</h2>
      <p>Use the OTP below. It expires in ${purpose === 'password_reset' ? '15' : '10'} minutes.</p>
      <div style="font-size:32px;font-weight:bold;letter-spacing:8px;padding:16px 0">${otp}</div>
      <p style="color:#888;font-size:12px">If you didn't request this, ignore this email.</p>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    html,
  });
}
