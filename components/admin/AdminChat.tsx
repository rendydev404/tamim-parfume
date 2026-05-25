'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { MessageCircle, Send, Loader2, ArrowLeft, Search, Package, ShoppingBag, Truck, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { useSearchParams } from 'next/navigation'

interface Conversation {
  id: string
  user_id: string
  subject: string | null
  status: string
  last_message_at: string
  user?: { id: string; full_name: string | null; email: string; avatar_url: string | null }
  last_message?: { message: string; sender_id: string; created_at: string }
  unread_count: number
}

interface Message {
  id: string
  message: string
  sender_id: string
  is_read: boolean
  created_at: string
  message_type?: 'text' | 'product_card' | 'order_card' | 'system'
  metadata?: Record<string, unknown>
  sender?: { id: string; full_name: string | null; avatar_url: string | null; role?: string }
}

function UserAvatar({ user, size = 40 }: { user?: { full_name: string | null; email?: string; avatar_url: string | null }; size?: number }) {
  const initial = (user?.full_name?.[0] || user?.email?.[0] || '?').toUpperCase()
  if (user?.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt={user.full_name || 'Avatar'}
        style={{
          width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0,
        }}
      />
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: 'var(--color-primary)',
      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.35, flexShrink: 0,
    }}>
      {initial}
    </div>
  )
}

function OnlineIndicator({ isOnline, size = 10 }: { isOnline: boolean; size?: number }) {
  return (
    <span style={{
      display: 'inline-block', width: size, height: size, borderRadius: '50%',
      background: isOnline ? '#22c55e' : '#9ca3af',
      border: '2px solid var(--color-bg)', flexShrink: 0,
    }} />
  )
}

const ORDER_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending_payment: { label: 'Menunggu Pembayaran', color: '#f59e0b' },
  paid: { label: 'Dibayar', color: '#3b82f6' },
  processing: { label: 'Diproses', color: '#8b5cf6' },
  shipped: { label: 'Dikirim', color: '#06b6d4' },
  delivered: { label: 'Selesai', color: '#10b981' },
}

function formatRp(amount: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
}

export default function AdminChatPage() {
  const searchParams = useSearchParams()
  const userIdParam = searchParams.get('userId')

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const selectedConvRef = useRef<string | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const presenceChannelRef = useRef<RealtimeChannel | null>(null)
  const supabaseRef = useRef(createClient())

  // Keep ref in sync with state for realtime callbacks
  useEffect(() => { selectedConvRef.current = selectedConv?.id || null }, [selectedConv?.id])

  // Initial load + Realtime subscriptions
  useEffect(() => {
    loadConversations()
    const supabase = supabaseRef.current

    // Subscribe to new messages (realtime)
    const msgChannel = supabase.channel('admin-chat-messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
      }, (payload) => {
        const newMsg = payload.new as any
        // If this message belongs to the currently selected conversation, append it
        if (newMsg.conversation_id === selectedConvRef.current) {
          // Fetch the full message with sender info
          loadMessages(newMsg.conversation_id)
        }
        // Refresh conversations list (for last_message, unread_count)
        loadConversations()
      })
      .subscribe()

    channelRef.current = msgChannel

    // Subscribe to presence (online status)
    const presenceChannel = supabase.channel('online-users', {
      config: { presence: { key: 'user_id' } },
    })

    presenceChannel.on('presence', { event: 'sync' }, () => {
      const state = presenceChannel.presenceState()
      const userIds = new Set<string>()
      Object.values(state).forEach((presences: any[]) => {
        presences.forEach((p) => {
          if (p.user_id) userIds.add(p.user_id)
        })
      })
      setOnlineUsers(userIds)
    })

    presenceChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        // Admin also tracks their own presence
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          presenceChannel.track({ user_id: user.id, role: 'admin' })
        }
      }
    })

    presenceChannelRef.current = presenceChannel

    return () => {
      supabase.removeChannel(msgChannel)
      supabase.removeChannel(presenceChannel)
    }
  }, [])

  // Scroll to bottom on new messages
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // Load messages when conversation changes
  useEffect(() => {
    if (selectedConv) {
      loadMessages(selectedConv.id)
    }
  }, [selectedConv?.id])

  const loadConversations = async () => {
    try {
      const res = await fetch('/api/chat')
      const json = await res.json()
      const convList = json.data || []
      setConversations(convList)

      // If userIdParam is present, look for or create conversation with this user
      if (userIdParam) {
        const existing = convList.find((c: Conversation) => c.user_id === userIdParam)
        if (existing) {
          setSelectedConv(existing)
        } else {
          // Create new conversation for this user
          const createRes = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: userIdParam,
              subject: 'Chat baru',
              message: 'Halo, ada yang bisa kami bantu?',
            })
          })
          const createJson = await createRes.json()
          if (createJson.data && createJson.data.conversation_id) {
            // Reload conversations to include the new one
            const reloadRes = await fetch('/api/chat')
            const reloadJson = await reloadRes.json()
            const reloadedConvs = reloadJson.data || []
            setConversations(reloadedConvs)
            const newConv = reloadedConvs.find((c: Conversation) => c.id === createJson.data.conversation_id)
            if (newConv) setSelectedConv(newConv)
          }
        }
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const loadMessages = async (convId: string) => {
    try {
      const res = await fetch(`/api/chat/${convId}`)
      const json = await res.json()
      setMessages(json.data || [])
    } catch (e) { console.error(e) }
  }

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedConv) return
    setSending(true)
    try {
      const res = await fetch(`/api/chat/${selectedConv.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newMessage.trim() }),
      })
      const json = await res.json()
      if (json.data) {
        setMessages((prev) => [...prev, json.data])
        setNewMessage('')
      }
    } catch (e) { console.error(e) }
    finally { setSending(false) }
  }

  const filteredConvs = conversations.filter((c) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      c.user?.full_name?.toLowerCase().includes(q) ||
      c.user?.email?.toLowerCase().includes(q) ||
      c.subject?.toLowerCase().includes(q)
    )
  })

  const formatTime = (d: string) => new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 80px)', gap: 0, borderRadius: 'var(--radius-xl)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
      {/* Sidebar */}
      <div style={{
        width: selectedConv ? '320px' : '100%',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--color-bg)',
      }} className={selectedConv ? 'admin-chat__sidebar--desktop' : ''}>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--color-border)' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}><MessageCircle size={18} /> Chat Pelanggan</h2>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari pelanggan..."
              style={{ width: '100%', padding: '8px 8px 8px 32px', fontSize: '13px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-secondary)' }}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
              <Loader2 size={24} className="animate-spin" />
            </div>
          ) : filteredConvs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)', fontSize: '14px' }}>
              Belum ada chat
            </div>
          ) : (
            filteredConvs.map((conv) => {
              const isUserOnline = onlineUsers.has(conv.user_id)
              return (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConv(conv)}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderBottom: '1px solid var(--color-border-light)',
                    background: selectedConv?.id === conv.id ? 'var(--color-bg-secondary)' : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    gap: '10px',
                    alignItems: 'center',
                    border: 'none',
                    fontFamily: 'inherit',
                    transition: 'background 0.15s',
                  }}
                >
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <UserAvatar user={conv.user} size={40} />
                    <span style={{ position: 'absolute', bottom: 0, right: 0 }}>
                      <OnlineIndicator isOnline={isUserOnline} size={12} />
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                      <span style={{ fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {conv.user?.full_name || conv.user?.email || 'Unknown'}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', flexShrink: 0 }}>
                        {formatTime(conv.last_message_at)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
                        {conv.last_message?.message || conv.subject || 'Tidak ada pesan'}
                      </span>
                      {conv.unread_count > 0 && (
                        <span style={{ background: 'var(--color-primary)', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '2px 7px', borderRadius: '10px', flexShrink: 0 }}>
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Chat Area */}
      {selectedConv ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--color-bg-secondary)' }}>
          {/* Chat Header */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => setSelectedConv(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex' }}>
              <ArrowLeft size={18} />
            </button>
            <div style={{ position: 'relative' }}>
              <UserAvatar user={selectedConv.user} size={36} />
              <span style={{ position: 'absolute', bottom: -1, right: -1 }}>
                <OnlineIndicator isOnline={onlineUsers.has(selectedConv.user_id)} size={11} />
              </span>
            </div>
            <div>
              <p style={{ fontWeight: 600, fontSize: '14px' }}>{selectedConv.user?.full_name || selectedConv.user?.email}</p>
              <p style={{ fontSize: '12px', color: onlineUsers.has(selectedConv.user_id) ? '#22c55e' : 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {onlineUsers.has(selectedConv.user_id) ? 'Online' : 'Offline'}
              </p>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflow: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {messages.map((msg) => {
              const isAdmin = msg.sender?.role === 'admin'
              const messageType = msg.message_type || 'text'

              // System message
              if (messageType === 'system') {
                return (
                  <div key={msg.id} style={{ textAlign: 'center', padding: '8px 0' }}>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', background: 'var(--color-bg-tertiary)', padding: '4px 12px', borderRadius: '12px' }}>{msg.message}</span>
                  </div>
                )
              }

              return (
                <div key={msg.id} style={{ display: 'flex', justifyContent: isAdmin ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '75%',
                    padding: '10px 14px',
                    borderRadius: '16px',
                    background: isAdmin ? 'var(--color-primary)' : 'var(--color-bg)',
                    color: isAdmin ? '#fff' : 'var(--color-text)',
                    border: isAdmin ? 'none' : '1px solid var(--color-border)',
                    borderBottomRightRadius: isAdmin ? '4px' : '16px',
                    borderBottomLeftRadius: isAdmin ? '16px' : '4px',
                  }}>
                    {/* Order Card */}
                    {messageType === 'order_card' && msg.metadata && (
                      <div style={{
                        background: isAdmin ? 'rgba(255,255,255,0.1)' : 'var(--color-bg-secondary)',
                        borderRadius: '10px',
                        padding: '10px',
                        marginBottom: '8px',
                        border: isAdmin ? '1px solid rgba(255,255,255,0.15)' : '1px solid var(--color-border-light)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700 }}>
                            <Package size={13} /> #{msg.metadata.order_number as string}
                          </span>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: ORDER_STATUS_LABELS[msg.metadata.status as string]?.color }}>
                            {(msg.metadata.status_label as string) || ''}
                          </span>
                        </div>
                        {Array.isArray(msg.metadata.items) && (msg.metadata.items as Array<Record<string, unknown>>).slice(0, 2).map((item, idx) => (
                          <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                            <div style={{
                              width: '32px', height: '32px', borderRadius: '4px', overflow: 'hidden', flexShrink: 0,
                              background: isAdmin ? 'rgba(255,255,255,0.1)' : 'var(--color-bg-tertiary)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              {item.image ? (
                                <img src={item.image as string} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <Package size={14} style={{ opacity: 0.5 }} />
                              )}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '12px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name as string}</div>
                              <div style={{ fontSize: '11px', opacity: 0.7 }}>{item.quantity as number}x {formatRp(item.price as number)}</div>
                            </div>
                          </div>
                        ))}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', paddingTop: '6px', borderTop: isAdmin ? '1px solid rgba(255,255,255,0.1)' : '1px solid var(--color-border-light)' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700 }}>Total: {formatRp(msg.metadata.total as number)}</span>
                          <a href={`/admin/orders/${msg.metadata.order_id}`} style={{ fontSize: '11px', fontWeight: 600, color: isAdmin ? '#fff' : 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '2px', textDecoration: 'none' }}>
                            Detail <ChevronRight size={12} />
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Product Card */}
                    {messageType === 'product_card' && msg.metadata && (
                      <div style={{
                        background: isAdmin ? 'rgba(255,255,255,0.1)' : 'var(--color-bg-secondary)',
                        borderRadius: '10px',
                        padding: '10px',
                        marginBottom: '8px',
                        display: 'flex', gap: '10px', alignItems: 'center',
                        border: isAdmin ? '1px solid rgba(255,255,255,0.15)' : '1px solid var(--color-border-light)',
                      }}>
                        <div style={{
                          width: '40px', height: '40px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0,
                          background: isAdmin ? 'rgba(255,255,255,0.1)' : 'var(--color-bg-tertiary)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {msg.metadata.image ? (
                            <img src={msg.metadata.image as string} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <ShoppingBag size={16} style={{ opacity: 0.5 }} />
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{msg.metadata.name as string}</div>
                          <div style={{ fontSize: '12px', fontWeight: 700 }}>{formatRp(msg.metadata.price as number)}</div>
                        </div>
                      </div>
                    )}

                    <p style={{ fontSize: '14px', lineHeight: 1.5, wordBreak: 'break-word' }}>{msg.message}</p>
                    <p style={{ fontSize: '10px', opacity: 0.7, marginTop: '4px', textAlign: 'right' }}>{formatTime(msg.created_at)}</p>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--color-border)', background: 'var(--color-bg)', display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Balas pesan..."
              style={{ flex: 1, padding: '10px 14px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', fontSize: '14px', background: 'var(--color-bg-secondary)' }}
              disabled={sending}
            />
            <button onClick={handleSend} disabled={sending || !newMessage.trim()} style={{
              padding: '10px 16px',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '14px',
              fontWeight: 500,
              opacity: !newMessage.trim() ? 0.5 : 1,
            }}>
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-secondary)' }} className="admin-chat__empty--desktop">
          <div style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <MessageCircle size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
            <p style={{ fontSize: '16px', fontWeight: 500 }}>Pilih percakapan</p>
            <p style={{ fontSize: '13px', marginTop: '4px' }}>Klik chat di sidebar untuk mulai membalas</p>
          </div>
        </div>
      )}
    </div>
  )
}
