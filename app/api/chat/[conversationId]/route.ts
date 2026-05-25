import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET messages for a conversation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { conversationId } = await params

  const { data: messages, error } = await supabase
    .from('chat_messages')
    .select('*, sender:profiles!chat_messages_sender_id_fkey(id, full_name, avatar_url, role)')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Mark messages as read
  await supabase
    .from('chat_messages')
    .update({ is_read: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', user.id)
    .eq('is_read', false)

  return NextResponse.json({ data: messages || [] })
}

// POST send a message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { conversationId } = await params
  const { message, message_type, metadata } = await request.json()

  if (!message?.trim()) {
    return NextResponse.json({ error: 'Pesan tidak boleh kosong' }, { status: 400 })
  }

  const insertPayload: Record<string, unknown> = {
    conversation_id: conversationId,
    sender_id: user.id,
    message: message.trim(),
  }
  if (message_type && message_type !== 'text') insertPayload.message_type = message_type
  if (metadata) insertPayload.metadata = metadata

  const { data, error } = await supabase
    .from('chat_messages')
    .insert(insertPayload)
    .select('*, sender:profiles!chat_messages_sender_id_fkey(id, full_name, avatar_url, role)')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Update conversation last_message_at
  await supabase
    .from('chat_conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId)

  // Send Telegram notification if sent by customer
  const senderRole = data.sender?.role
  const isCustomer = senderRole !== 'admin'
  if (isCustomer) {
    try {
      const senderName = data.sender?.full_name || user.email || 'Pelanggan'
      const { sendTelegramNotification } = await import('@/lib/telegram')
      await sendTelegramNotification(conversationId, senderName, message.trim())
    } catch (err) {
      console.error('Failed to trigger Telegram notification:', err)
    }
  }

  return NextResponse.json({ data })
}
