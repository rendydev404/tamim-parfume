import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET conversations
export async function GET() {
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

  let query = supabase
    .from('chat_conversations')
    .select('*, user:profiles!chat_conversations_user_id_fkey(id, full_name, email, avatar_url)')
    .order('last_message_at', { ascending: false })

  if (!isAdmin) {
    query = query.eq('user_id', user.id)
  }

  const { data: conversations, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Get last message and unread count for each conversation
  const enriched = await Promise.all(
    (conversations || []).map(async (conv) => {
      const { data: lastMsg } = await supabase
        .from('chat_messages')
        .select('*, sender:profiles!chat_messages_sender_id_fkey(id, full_name, avatar_url)')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      const { count: unreadCount } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conv.id)
        .eq('is_read', false)
        .neq('sender_id', user.id)

      return {
        ...conv,
        last_message: lastMsg || null,
        unread_count: unreadCount || 0,
      }
    })
  )

  return NextResponse.json({ data: enriched })
}

// POST create new conversation
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { subject, message, message_type, metadata } = await request.json()

  // Check if user already has an open conversation
  const { data: existing } = await supabase
    .from('chat_conversations')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'open')
    .limit(1)
    .single()

  if (existing) {
    // Add message to existing conversation
    if (message) {
      const msgPayload: Record<string, unknown> = {
        conversation_id: existing.id,
        sender_id: user.id,
        message,
      }
      if (message_type && message_type !== 'text') msgPayload.message_type = message_type
      if (metadata) msgPayload.metadata = metadata
      await supabase.from('chat_messages').insert(msgPayload)
      await supabase
        .from('chat_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', existing.id)
    }
    return NextResponse.json({ data: { conversation_id: existing.id } })
  }

  // Create new conversation
  const { data: conv, error } = await supabase
    .from('chat_conversations')
    .insert({
      user_id: user.id,
      subject: subject || 'Chat baru',
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Send first message
  if (message) {
    const msgPayload: Record<string, unknown> = {
      conversation_id: conv.id,
      sender_id: user.id,
      message,
    }
    if (message_type && message_type !== 'text') msgPayload.message_type = message_type
    if (metadata) msgPayload.metadata = metadata
    await supabase.from('chat_messages').insert(msgPayload)
  }

  return NextResponse.json({ data: { conversation_id: conv.id } })
}
