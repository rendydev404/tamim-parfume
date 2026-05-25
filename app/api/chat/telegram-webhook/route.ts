import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 1. Check if the request has a valid message structure from Telegram
    if (!body || !body.message) {
      return NextResponse.json({ success: true, message: 'No message in payload' })
    }

    const { chat, text, reply_to_message } = body.message
    const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID
    const botToken = process.env.TELEGRAM_BOT_TOKEN

    // 2. Security Check: Only allow messages from the configured Admin Chat ID
    if (!adminChatId || !botToken) {
      console.error('[Telegram Webhook] Bot token or admin Chat ID is not configured.')
      return NextResponse.json({ success: false, error: 'Server not configured' }, { status: 500 })
    }

    if (chat.id.toString() !== adminChatId) {
      console.warn(`[Telegram Webhook] Unauthorized message from chat ID: ${chat.id}`)
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Helper function to send message back to Telegram admin
    const sendTelegramReply = async (replyText: string, replyToMessageId?: number) => {
      try {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: adminChatId,
            text: replyText,
            parse_mode: 'Markdown',
            reply_to_message_id: replyToMessageId,
          }),
        })
      } catch (err) {
        console.error('[Telegram Webhook] Failed to send reply to admin:', err)
      }
    }

    // 3. User-friendly check: If Admin is not replying to a bot message
    if (!reply_to_message || !reply_to_message.text) {
      await sendTelegramReply(
        `⚠️ *Gagal Membalas Chat*\n\nSilakan gunakan fitur *Reply* (Balas) langsung pada pesan notifikasi pelanggan yang ingin Anda jawab.`,
        body.message.message_id
      )
      return NextResponse.json({ success: true, message: 'Replied instruction sent' })
    }

    // 4. Parse the conversation ID [Ref: UUID] from the original bot message
    const replySourceText = reply_to_message.text
    const refMatch = replySourceText.match(/\[Ref:\s*([a-fA-F0-9-]+)\]/)

    if (!refMatch) {
      await sendTelegramReply(
        `⚠️ *ID Referensi Tidak Ditemukan*\n\nFormat notifikasi tidak memiliki ID referensi chat yang valid. Harap balas pada pesan notifikasi chat pelanggan yang resmi.`,
        body.message.message_id
      )
      return NextResponse.json({ success: false, error: 'Reference ID not found' })
    }

    const conversationId = refMatch[1]

    if (!text || !text.trim()) {
      return NextResponse.json({ success: true, message: 'Empty text' })
    }

    // 5. Initialize admin Supabase client (bypasses RLS)
    const supabaseAdmin = createAdminClient()

    // 6. Find the Admin's user ID from profiles
    const { data: adminProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'admin')
      .limit(1)
      .single()

    if (profileError || !adminProfile) {
      console.error('[Telegram Webhook] Failed to get admin profile ID:', profileError)
      await sendTelegramReply(
        `⚠️ *Kesalahan Sistem*\n\nTidak dapat menemukan profil Admin di database website Anda.`,
        body.message.message_id
      )
      return NextResponse.json({ success: false, error: 'Admin profile not found' })
    }

    // 7. Verify the conversation exists
    const { data: conversation, error: convError } = await supabaseAdmin
      .from('chat_conversations')
      .select('id, subject, user_id')
      .eq('id', conversationId)
      .single()

    if (convError || !conversation) {
      await sendTelegramReply(
        `⚠️ *Chat Tidak Ditemukan*\n\nPercakapan ini mungkin sudah dihapus atau tidak valid di database website Anda.`,
        body.message.message_id
      )
      return NextResponse.json({ success: false, error: 'Conversation not found' })
    }

    // 8. Insert the reply into Supabase as the Admin
    const { error: msgInsertError } = await supabaseAdmin
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: adminProfile.id,
        message: text.trim(),
      })

    if (msgInsertError) {
      console.error('[Telegram Webhook] Failed to insert message:', msgInsertError)
      await sendTelegramReply(
        `⚠️ *Gagal Mengirim Pesan*\n\nTerjadi kesalahan saat menyimpan pesan Anda ke database website.`,
        body.message.message_id
      )
      return NextResponse.json({ success: false, error: 'Insert failed' }, { status: 500 })
    }

    // 9. Update last message timestamp
    await supabaseAdmin
      .from('chat_conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId)

    // 10. Send a beautiful success confirmation back to the admin in Telegram
    await sendTelegramReply(
      `✅ *Pesan Terkirim!*\n\nJawaban Anda telah sukses terkirim ke pelanggan di website.`,
      body.message.message_id
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Telegram Webhook Error]:', error)
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
  }
}
