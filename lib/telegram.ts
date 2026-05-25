import { createClient } from '@/lib/supabase/server'

/**
 * Sends a Telegram notification to the Admin when a customer sends a chat message.
 */
export async function sendTelegramNotification(
  conversationId: string,
  senderName: string,
  messageText: string
) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID

  // If Telegram integration is not configured, silently return
  if (!botToken || !chatId) {
    return
  }

  try {
    const text = `💬 *Chat Baru dari Pelanggan!*\n\n👤 *Nama:* ${senderName}\n💬 *Pesan:* ${messageText}\n\n` +
      `_Balas pesan ini langsung untuk menjawab pelanggan._\n\n` +
      `\`[Ref: ${conversationId}]\``

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('[Telegram Notification] Failed to send:', errText)
    }
  } catch (error) {
    console.error('[Telegram Notification] Error sending notification:', error)
  }
}
