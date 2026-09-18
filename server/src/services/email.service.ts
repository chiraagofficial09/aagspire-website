import { Resend } from 'resend';
import { ENV } from '../config/env.js';

let resendClient: Resend | null = null;

function getResendClient(): Resend {
  const apiKey = ENV.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured in environment variables.');
  }
  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

/**
 * Send a password reset email with a clickable reset link via Resend.
 */
export async function sendPasswordResetEmail(
  to: string,
  resetToken: string
): Promise<void> {
  const clientOrigin = ENV.CLIENT_ORIGIN[0] || 'http://localhost:5173';
  const resetUrl = `${clientOrigin}/work/reset-password?token=${resetToken}`;
  const from = ENV.RESEND_FROM_EMAIL || 'Aagspire <onboarding@resend.dev>';

  const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset Your Password</title>
</head>
<body style="margin:0;padding:0;background-color:#08090d;font-family:'Segoe UI',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#08090d;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#0d0e14;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;">
          
          <!-- Header -->
          <tr>
            <td style="padding:32px 32px 20px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.06);">
              <div style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Aagspire</div>
              <div style="font-size:10px;font-weight:600;color:rgba(255,255,255,0.5);letter-spacing:2px;text-transform:uppercase;margin-top:4px;">WORKSPACE PORTAL</div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <div style="width:48px;height:48px;border-radius:12px;background-color:rgba(255,90,31,0.12);border:1px solid rgba(255,90,31,0.25);margin:0 auto 20px;text-align:center;line-height:48px;">
                <span style="font-size:22px;">&#128273;</span>
              </div>
              
              <h2 style="margin:0 0 8px;font-size:18px;font-weight:700;color:#ffffff;text-align:center;">
                Password Reset Request
              </h2>
              <p style="margin:0 0 24px;font-size:13px;color:rgba(255,255,255,0.6);text-align:center;line-height:1.6;">
                We received a request to reset your password. Click the button below to create a new password.
              </p>

              <!-- Reset Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 24px;">
                    <a href="${resetUrl}" 
                       target="_blank"
                       style="display:inline-block;padding:14px 36px;background-color:#FF5A1F;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:12px;letter-spacing:0.3px;">
                      Reset My Password
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 16px;font-size:12px;color:rgba(255,255,255,0.4);text-align:center;line-height:1.5;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <div style="padding:12px 16px;background-color:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;word-break:break-all;">
                <a href="${resetUrl}" style="font-size:11px;color:#FF5A1F;text-decoration:none;font-family:monospace;">${resetUrl}</a>
              </div>

              <div style="margin-top:24px;padding:16px;background-color:rgba(255,90,31,0.06);border:1px solid rgba(255,90,31,0.15);border-radius:10px;">
                <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.5);line-height:1.6;">
                  &#9200; This link expires in <strong style="color:#FF5A1F;">1 hour</strong>.<br/>
                  &#128274; If you didn't request this, please ignore this email. Your password will remain unchanged.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
              <p style="margin:0;font-size:10px;color:rgba(255,255,255,0.3);">
                &copy; ${new Date().getFullYear()} Aagspire. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  // 1. If EmailJS template is configured, send via EmailJS REST API (HTTPS - port 443)
  if (ENV.EMAILJS_TEMPLATE_ID) {
    const payload: Record<string, any> = {
      service_id: ENV.EMAILJS_SERVICE_ID || 'service_b81cuxs',
      template_id: ENV.EMAILJS_TEMPLATE_ID,
      user_id: ENV.EMAILJS_PUBLIC_KEY || '8PDKzojjqVOtZ9Dhn',
      template_params: {
        to_email: to,
        email: to,
        recipient_email: to,
        reset_link: resetUrl,
        reset_url: resetUrl,
        from_name: 'Aagspire',
      },
    };

    if (ENV.EMAILJS_PRIVATE_KEY) {
      payload.accessToken = ENV.EMAILJS_PRIVATE_KEY;
    }

    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[EmailService] EmailJS send error:', response.status, errText);
      throw new Error(errText || 'Failed to send password reset email via EmailJS.');
    }

    console.log(`[EmailService] Password reset email successfully sent via EmailJS to ${to}.`);
    return;
  }

  // 2. Otherwise send via Resend
  const resend = getResendClient();
  const { data, error } = await resend.emails.send({
    from,
    to: [to],
    subject: 'Reset Your Password — Aagspire',
    html: htmlBody,
  });

  if (error) {
    console.error('[EmailService] Resend API error:', error);
    throw new Error(error.message || 'Failed to send password reset email via Resend.');
  }

  console.log(`[EmailService] Password reset email successfully sent to ${to}. MessageId: ${data?.id}`);
}
