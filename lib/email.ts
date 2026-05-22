import nodemailer from 'nodemailer'

function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD,
    },
  })
}

export function generateOTP(length = 8): string {
  const digits = '0123456789'
  let otp = ''
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)]
  }
  return otp
}

export async function sendOTPEmail(email: string, otpCode: string): Promise<void> {
  const transporter = getTransporter()
  const mailOptions = {
    from: `"TAMIM PARFUME" <${process.env.SMTP_EMAIL}>`,
    to: email,
    subject: 'Kode OTP - Atur Ulang Password',
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="font-size: 20px; font-weight: 700; color: #1a1a2e; margin: 0 0 4px 0; letter-spacing: 0.05em;">TAMIM PARFUME</h1>
          <p style="font-size: 13px; color: #888; margin: 0;">Atur Ulang Password</p>
        </div>
        
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 32px 24px; text-align: center; margin-bottom: 24px;">
          <p style="color: #ccc; font-size: 13px; margin: 0 0 16px 0;">Kode verifikasi Anda:</p>
          <div style="background: rgba(255,255,255,0.1); border-radius: 12px; padding: 16px 24px; display: inline-block;">
            <span style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #ffffff; font-family: 'Courier New', monospace;">${otpCode}</span>
          </div>
          <p style="color: #aaa; font-size: 12px; margin: 16px 0 0 0;">Kode berlaku selama <strong style="color: #f59e0b;">10 menit</strong></p>
        </div>

        <div style="background: #f8f9fa; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
          <p style="font-size: 13px; color: #555; margin: 0; line-height: 1.6;">
            ⚠️ Jika Anda tidak meminta pengaturan ulang password, abaikan email ini. Jangan bagikan kode ini kepada siapapun.
          </p>
        </div>

        <div style="text-align: center; border-top: 1px solid #eee; padding-top: 16px;">
          <p style="font-size: 11px; color: #aaa; margin: 0;">© ${new Date().getFullYear()} TAMIM PARFUME. All rights reserved.</p>
        </div>
      </div>
    `,
  }

  await transporter.sendMail(mailOptions)
}
