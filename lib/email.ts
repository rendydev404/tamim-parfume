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

export async function sendChatReplyEmail(
  email: string,
  customerName: string,
  replyText: string
): Promise<void> {
  const transporter = getTransporter()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.tamimparfume.my.id'
  
  const mailOptions = {
    from: `"TAMIM PARFUME" <${process.env.SMTP_EMAIL}>`,
    to: email,
    subject: 'Ada Balasan Chat Baru - TAMIM PARFUME',
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="font-size: 22px; font-weight: 700; color: #1a1a2e; margin: 0 0 4px 0; letter-spacing: 0.05em;">TAMIM PARFUME</h1>
          <p style="font-size: 12px; color: #777; margin: 0; text-transform: uppercase; letter-spacing: 1px;">Customer Support</p>
        </div>
        
        <div style="background: #f8f9fa; border-radius: 16px; padding: 24px; border: 1px solid #eaeaea; margin-bottom: 24px;">
          <p style="font-size: 15px; color: #333; margin: 0 0 16px 0;">Halo <strong>${customerName}</strong>,</p>
          <p style="font-size: 14px; color: #555; line-height: 1.5; margin: 0 0 20px 0;">
            Admin **Tamim Parfume** baru saja membalas pesan chat Anda:
          </p>
          
          <div style="background: #ffffff; border-left: 4px solid #1a1a2e; border-radius: 4px 12px 12px 4px; padding: 16px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
            <p style="font-size: 14px; color: #1a1a2e; font-style: italic; margin: 0; line-height: 1.6;">
              "${replyText}"
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 24px;">
            <a href="${appUrl}" target="_blank" style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 30px; font-size: 14px; font-weight: 600; display: inline-block; box-shadow: 0 4px 15px rgba(26,26,46,0.2); transition: all 0.3s ease;">
              Lihat & Balas Chat
            </a>
          </div>
        </div>
        
        <div style="text-align: center; border-top: 1px solid #eee; padding-top: 16px; margin-top: 32px;">
          <p style="font-size: 11px; color: #aaa; margin: 0 0 4px 0;">Email ini dikirim secara otomatis karena Anda memiliki pesan yang belum terbaca.</p>
          <p style="font-size: 11px; color: #bbb; margin: 0;">© ${new Date().getFullYear()} TAMIM PARFUME. All rights reserved.</p>
        </div>
      </div>
    `,
  }

  await transporter.sendMail(mailOptions)
}
