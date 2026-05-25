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
  } else {
    // If Admin sends the message, notify the customer via email!
    try {
      const { data: conversation } = await supabase
        .from('chat_conversations')
        .select('user_id')
        .eq('id', conversationId)
        .single()

      if (conversation) {
        const { data: customerProfile } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', conversation.user_id)
          .single()

        if (customerProfile && customerProfile.email) {
          const { sendChatReplyEmail } = await import('@/lib/email')
          sendChatReplyEmail(
            customerProfile.email,
            customerProfile.full_name || 'Pelanggan',
            message.trim()
          ).catch(err => console.error('[API Chat] Failed to send email notification:', err))
        }
      }
    } catch (err) {
      console.error('[API Chat] Error sending email notification to customer:', err)
    }
  }

  return NextResponse.json({ data })
}

// DELETE a conversation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { conversationId } = await params

  // Use service role admin client to bypass any RLS delete restrictions
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const supabaseAdmin = createAdminClient()

  // Delete messages first to satisfy foreign key constraints if cascade is not set
  await supabaseAdmin
    .from('chat_messages')
    .delete()
    .eq('conversation_id', conversationId)

  // Delete conversation
  const { error } = await supabaseAdmin
    .from('chat_conversations')
    .delete()
    .eq('id', conversationId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
