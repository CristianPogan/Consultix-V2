import nodemailer from 'nodemailer';

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === 'true';
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

export async function sendPasswordResetEmail(to, resetLink, userName = 'User') {
  const transporter = getTransporter();
  const appName = process.env.APP_NAME || 'ConsultiX';
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@consultix.app';

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Reset your password</title></head>
<body style="font-family: system-ui, sans-serif; line-height: 1.6; color: #333; max-width: 500px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #0a0a0f;">Reset your password</h2>
  <p>Hi ${userName},</p>
  <p>You requested a password reset for your ${appName} account. Click the button below to set a new password:</p>
  <p style="margin: 24px 0;">
    <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background: #c4f04d; color: #0a0a0f; text-decoration: none; font-weight: 600; border-radius: 8px;">Reset password</a>
  </p>
  <p style="font-size: 13px; color: #666;">Or copy this link: ${resetLink}</p>
  <p style="font-size: 12px; color: #999;">This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
  <p style="margin-top: 32px; font-size: 12px; color: #999;">— ${appName}</p>
</body>
</html>`;

  if (!transporter) {
    console.log('[Email] SMTP not configured. Password reset link:', resetLink);
    return { sent: false, link: resetLink };
  }

  try {
    await transporter.sendMail({
      from,
      to,
      subject: `Reset your ${appName} password`,
      html,
      text: `Hi ${userName},\n\nReset your password: ${resetLink}\n\nThis link expires in 1 hour.`,
    });
    return { sent: true };
  } catch (err) {
    console.error('[Email] Send failed:', err);
    throw err;
  }
}
