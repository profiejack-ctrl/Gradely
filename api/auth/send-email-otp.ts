import jwt from 'jsonwebtoken';
import { supabase } from '../lib/supabase';
import { sendOtpEmail, getSmtpConfig } from '../lib/mailer';
import { saveOtp } from '../lib/otpVault';

function setCors(res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req: any, res: any) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { email } = req.body || {};
  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    res.status(400).json({ error: 'Please enter a valid email address.' });
    return;
  }

  const cleanEmail = email.toLowerCase().trim();

  // Try extracting student identifier from Authorization token if available
  let userId = '';
  let studentName = '';
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const secret = process.env.JWT_SECRET || 'gradely-production-jwt-vault-secret-key-2026';
      const decoded: any = jwt.verify(token, secret);
      userId = decoded.userId || '';
      studentName = decoded.name || '';
    } catch {
      // Ignore token decode error for otp generation
    }
  }

  try {
    // If Supabase is configured, verify email is not already claimed
    if (supabase && userId) {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, name')
        .ilike('email', cleanEmail)
        .neq('id', userId)
        .maybeSingle();

      if (existingUser) {
        res.status(409).json({ error: 'This email address is already associated with another student account.' });
        return;
      }
    }

    // Generate random 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Save to OTP vault by email (and by userId if present)
    const otpData = {
      email: cleanEmail,
      code,
      expiresAt,
      attempts: 0,
      studentId: userId,
    };

    await saveOtp(cleanEmail, otpData);
    if (userId) {
      await saveOtp(userId, otpData);
    }

    // Attempt delivery via SMTP
    const mailResult = await sendOtpEmail(cleanEmail, code, studentName);
    const smtpConfig = getSmtpConfig();

    if (!mailResult.delivered && mailResult.mode === 'smtp') {
      // Provide actionable message for Gmail authentication errors
      const errDetails = mailResult.error || '';
      let userFriendlyMessage = 'Failed to deliver email through Gmail SMTP.';
      if (errDetails.includes('535') || errDetails.includes('Username and Password not accepted') || errDetails.includes('BadCredentials')) {
        userFriendlyMessage =
          'Gmail rejected the password. Please verify that: (1) 2-Step Verification is enabled on your Google Account, and (2) You generated and used a 16-character Google App Password (myaccount.google.com/apppasswords), NOT your normal Gmail password.';
      }

      res.status(500).json({
        error: userFriendlyMessage,
        details: errDetails,
        smtpConfigured: true,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: mailResult.mode === 'smtp'
        ? `A 6-digit verification code was sent to ${cleanEmail}.`
        : 'SMTP not configured: use test code 123456 or configure SMTP_USER & SMTP_PASS in Vercel.',
      mode: mailResult.mode,
      smtpUser: smtpConfig.user ? `${smtpConfig.user.slice(0, 3)}***` : undefined,
      devOtp: mailResult.mode === 'simulated' ? '123456' : undefined,
    });
  } catch (err: any) {
    console.error('Unhandled error in send-email-otp:', err);
    res.status(500).json({ error: 'Internal server error while processing verification code.' });
  }
}
