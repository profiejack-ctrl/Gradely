import nodemailer from 'nodemailer';

export interface SendOtpResult {
  delivered: boolean;
  mode: 'smtp' | 'simulated';
  error?: string;
}

export function getSmtpConfig() {
  const user = (
    process.env.SMTP_USER ||
    process.env.GMAIL_USER ||
    process.env.EMAIL_USER ||
    process.env.MAIL_USER ||
    process.env.GMAIL_EMAIL ||
    process.env.EMAIL ||
    ''
  ).trim();

  const rawPass = (
    process.env.SMTP_PASS ||
    process.env.SMTP_PASSWORD ||
    process.env.GMAIL_PASS ||
    process.env.GMAIL_PASSWORD ||
    process.env.GMAIL_APP_PASSWORD ||
    process.env.EMAIL_PASS ||
    process.env.EMAIL_PASSWORD ||
    process.env.PASSWORD ||
    ''
  ).trim();

  // Strip spaces if user pasted a Google App Password (e.g. "abcd efgh ijkl mnop")
  const pass = rawPass.replace(/\s+/g, '');

  const host = (
    process.env.SMTP_HOST ||
    (user.includes('@gmail.com') ? 'smtp.gmail.com' : 'smtp.gmail.com')
  ).trim();

  const port = Number(process.env.SMTP_PORT) || 465;
  const isSecure = process.env.SMTP_SECURE === 'true' || port === 465;
  const fromAddress = process.env.SMTP_FROM || `"Gradely SMS" <${user || 'no-reply@gradely.edu'}>`;

  const isConfigured = Boolean(user && pass);

  return {
    user,
    pass,
    host,
    port,
    isSecure,
    fromAddress,
    isConfigured,
  };
}

export async function sendOtpEmail(
  toEmail: string,
  otpCode: string,
  studentName?: string
): Promise<SendOtpResult> {
  const config = getSmtpConfig();

  const subject = `Your Gradely Verification Code: ${otpCode}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Gradely Verification Code</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <div style="max-width: 520px; margin: 30px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1e3a8a 0%, #1e1b4b 100%); padding: 32px 24px; text-align: center;">
          <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">Gradely</h1>
          <p style="margin: 6px 0 0 0; color: #93c5fd; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px;">Student Portal Verification</p>
        </div>

        <!-- Body -->
        <div style="padding: 32px 28px;">
          <h2 style="margin: 0 0 12px 0; color: #0f172a; font-size: 18px; font-weight: 700;">
            ${studentName ? `Hello, ${studentName}` : 'Verify Your Email Address'}
          </h2>
          <p style="margin: 0 0 24px 0; color: #475569; font-size: 14px; line-height: 1.6;">
            You are linking this email address to your official <strong>Gradely Student Account</strong>. Please use the 6-digit verification code below to verify your email and activate your portal:
          </p>

          <!-- OTP Box -->
          <div style="text-align: center; margin: 28px 0; padding: 20px; background-color: #f8fafc; border: 2px dashed #3b82f6; border-radius: 12px;">
            <div style="font-family: 'SF Mono', Monaco, 'Courier New', monospace; font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #1d4ed8; display: inline-block;">
              ${otpCode}
            </div>
            <p style="margin: 8px 0 0 0; font-size: 11px; color: #64748b; font-weight: 500;">
              Enter this code in your browser prompt
            </p>
          </div>

          <!-- Note -->
          <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 12px; color: #1e40af; line-height: 1.5;">
              ⏱️ This verification code is valid for <strong>10 minutes</strong>. If you did not initiate this request, you can safely ignore this email.
            </p>
          </div>

          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />

          <p style="margin: 0; font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.4;">
            This is an automated security transmission from Bestlink College of the Philippines — Gradely Student Information System.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `Gradely Student Portal Verification Code: ${otpCode}\n\nHello ${studentName || 'Student'},\n\nUse this 6-digit code to verify your email address: ${otpCode}\n\nThis code expires in 10 minutes.`;

  if (config.isConfigured) {
    try {
      const isGmail = config.host.includes('gmail') || config.user.includes('@gmail.com');

      const transporter = isGmail
        ? nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: config.user,
              pass: config.pass,
            },
          })
        : nodemailer.createTransport({
            host: config.host,
            port: config.port,
            secure: config.isSecure,
            auth: {
              user: config.user,
              pass: config.pass,
            },
          });

      await transporter.sendMail({
        from: config.fromAddress,
        to: toEmail,
        subject,
        text,
        html,
      });

      console.log(`[mailer] OTP email successfully sent to ${toEmail}`);
      return { delivered: true, mode: 'smtp' };
    } catch (err: any) {
      console.error(`[mailer] Failed to send via SMTP to ${toEmail}:`, err.message);
      return { delivered: false, mode: 'smtp', error: err.message };
    }
  }

  // Fallback simulator if SMTP credentials are missing
  console.log(`
======================================================================
📧  [OTP EMAIL SIMULATOR]
To:      ${toEmail}
Student: ${studentName || 'Student'}
Code:    ${otpCode} (Valid for 10 minutes)
Note:    Configure SMTP_USER and SMTP_PASS on Vercel to send live emails
======================================================================
  `);

  return { delivered: true, mode: 'simulated' };
}
