'use client'

import { useState, useEffect, useRef } from 'react'
import { MessageCircle, X, Send, Loader2, Minus, Package, ShoppingBag, HelpCircle, Truck, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface Message {
  id: string
  message: string
  sender_id: string
  is_read: boolean
  created_at: string
  message_type?: 'text' | 'product_card' | 'order_card' | 'system'
  metadata?: Record<string, unknown>
  sender?: {
    id: string
    full_name: string | null
    avatar_url: string | null
    role?: string
  }
}

interface OrderItem {
  id: string
  product_name: string
  product_image: string | null
  quantity: number
  price: number
  subtotal: number
}

interface ActiveOrder {
  id: string
  order_number: string
  status: string
  total: number
  created_at: string
  shipping_courier: string | null
  shipping_service: string | null
  shipping_tracking: string | null
  items: OrderItem[]
}

interface ChatContext {
  active_orders: ActiveOrder[]
}

const ORDER_STATUS_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  pending_payment: { label: 'Menunggu Pembayaran', color: '#f59e0b', icon: '⏳' },
  paid: { label: 'Dibayar', color: '#3b82f6', icon: '✅' },
  processing: { label: 'Diproses', color: '#8b5cf6', icon: '📦' },
  shipped: { label: 'Dikirim', color: '#06b6d4', icon: '🚚' },
}

function formatRp(amount: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [chatContext, setChatContext] = useState<ChatContext | null>(null)
  const [contextLoading, setContextLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const conversationIdRef = useRef<string | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const presenceChannelRef = useRef<RealtimeChannel | null>(null)
  const supabaseRef = useRef(createClient())

  // Keep ref in sync
  useEffect(() => { conversationIdRef.current = conversationId }, [conversationId])

  useEffect(() => {
    checkAuth()
    return () => {
      const supabase = supabaseRef.current
      if (channelRef.current) supabase.removeChannel(channelRef.current)
      if (presenceChannelRef.current) supabase.removeChannel(presenceChannelRef.current)
    }
  }, [])

  // Setup realtime subscription when we have a conversationId
  useEffect(() => {
    if (!conversationId || !userId) return
    const supabase = supabaseRef.current

    if (channelRef.current) supabase.removeChannel(channelRef.current)

    const msgChannel = supabase.channel(`chat-widget-${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const newMsg = payload.new as any
        if (newMsg.sender_id !== userId && (!isOpen || isMinimized)) {
          setUnreadCount((prev) => prev + 1)
        }
        loadMessages()
      })
      .subscribe()

    channelRef.current = msgChannel

    return () => {
      supabase.removeChannel(msgChannel)
    }
  }, [conversationId, userId])

  // Setup presence tracking
  useEffect(() => {
    if (!userId) return
    const supabase = supabaseRef.current

    const presenceChannel = supabase.channel('online-users', {
      config: { presence: { key: 'user_id' } },
    })

    presenceChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        presenceChannel.track({ user_id: userId, role: 'user' })
      }
    })

    presenceChannelRef.current = presenceChannel

    return () => {
      supabase.removeChannel(presenceChannel)
    }
  }, [userId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const checkAuth = async () => {
    const supabase = supabaseRef.current
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setUserId(user.id)
      const res = await fetch('/api/chat')
      const json = await res.json()
      const convs = json.data || []
      const openConv = convs.find((c: { status: string }) => c.status === 'open')
      if (openConv) {
        setConversationId(openConv.id)
        setUnreadCount(openConv.unread_count || 0)
      }
    }
  }

  const loadChatContext = async () => {
    setContextLoading(true)
    try {
      const res = await fetch('/api/chat/context')
      const json = await res.json()
      setChatContext(json.data || null)
    } catch (e) {
      console.error('Failed to load chat context', e)
    } finally {
      setContextLoading(false)
    }
  }

  const loadMessages = async () => {
    if (!conversationIdRef.current) return
    try {
      const res = await fetch(`/api/chat/${conversationIdRef.current}`)
      const json = await res.json()
      setMessages(json.data || [])
    } catch (e) {
      console.error('Failed to load messages', e)
    }
  }

  const handleOpen = async () => {
    setIsOpen(true)
    setIsMinimized(false)
    setUnreadCount(0)

    if (!userId) return

    // Load context for smart suggestions
    loadChatContext()

    if (conversationId) {
      setLoading(true)
      await loadMessages()
      setLoading(false)
    }
  }

  const handleSend = async (msgText?: string, msgType?: string, msgMetadata?: Record<string, unknown>) => {
    const text = msgText || newMessage.trim()
    if (!text) return
    setSending(true)

    try {
      if (!conversationId) {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: 'Chat baru',
            message: text,
            message_type: msgType || 'text',
            metadata: msgMetadata || null,
          }),
        })
        const json = await res.json()
        if (json.data?.conversation_id) {
          setConversationId(json.data.conversation_id)
          setNewMessage('')
          setTimeout(async () => {
            const msgRes = await fetch(`/api/chat/${json.data.conversation_id}`)
            const msgJson = await msgRes.json()
            setMessages(msgJson.data || [])
          }, 300)
        }
      } else {
        const res = await fetch(`/api/chat/${conversationId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            message_type: msgType || 'text',
            metadata: msgMetadata || null,
          }),
        })
        const json = await res.json()
        if (json.data) {
          setMessages((prev) => [...prev, json.data])
          setNewMessage('')
        }
      }
    } catch (e) {
      console.error('Failed to send message', e)
    } finally {
      setSending(false)
    }
  }

  const handleQuickAction = (action: string, order?: ActiveOrder) => {
    if (action === 'ask_order' && order) {
      const statusInfo = ORDER_STATUS_LABELS[order.status] || { label: order.status, icon: '📦' }
      const text = `Saya ingin bertanya tentang pesanan #${order.order_number}`
      const metadata = {
        order_id: order.id,
        order_number: order.order_number,
        status: order.status,
        status_label: statusInfo.label,
        total: order.total,
        items: order.items.map(i => ({
          name: i.product_name,
          image: i.product_image,
          quantity: i.quantity,
          price: i.price,
        })),
        shipping_tracking: order.shipping_tracking,
        shipping_courier: order.shipping_courier,
      }
      handleSend(text, 'order_card', metadata)
    } else if (action === 'track_order' && order) {
      handleSend(`Saya ingin melacak pengiriman pesanan #${order.order_number}`, 'order_card', {
        order_id: order.id,
        order_number: order.order_number,
        status: order.status,
        status_label: ORDER_STATUS_LABELS[order.status]?.label || order.status,
        total: order.total,
        items: order.items.map(i => ({
          name: i.product_name,
          image: i.product_image,
          quantity: i.quantity,
          price: i.price,
        })),
        shipping_tracking: order.shipping_tracking,
        shipping_courier: order.shipping_courier,
      })
    } else if (action === 'ask_product') {
      handleSend('Saya ingin bertanya tentang produk')
    } else if (action === 'help') {
      handleSend('Saya butuh bantuan')
    } else if (action === 'check_order') {
      handleSend('Saya ingin cek status pesanan saya')
    }
  }

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  }

  // Render a rich message based on type
  const renderMessage = (msg: Message) => {
    const isOwn = msg.sender_id === userId
    const messageType = msg.message_type || 'text'

    if (messageType === 'system') {
      return (
        <div key={msg.id} className="chat-widget__system-msg">
          <span>{msg.message}</span>
        </div>
      )
    }

    return (
      <div key={msg.id} className={`chat-widget__msg ${isOwn ? 'chat-widget__msg--own' : 'chat-widget__msg--other'}`}>
        <div className="chat-widget__msg-bubble">
          {!isOwn && msg.sender?.role === 'admin' && (
            <span className="chat-widget__msg-admin-badge">Admin</span>
          )}

          {/* Order Card */}
          {messageType === 'order_card' && msg.metadata && (
            <div className="chat-widget__order-card">
              <div className="chat-widget__order-card-header">
                <div className="chat-widget__order-card-number">
                  <Package size={14} />
                  <span>#{(msg.metadata.order_number as string) || ''}</span>
                </div>
                <span
                  className="chat-widget__order-card-status"
                  style={{ color: ORDER_STATUS_LABELS[msg.metadata.status as string]?.color || '#999' }}
                >
                  {(msg.metadata.status_label as string) || msg.metadata.status as string}
                </span>
              </div>

              {/* Items preview */}
              {Array.isArray(msg.metadata.items) && (msg.metadata.items as Array<Record<string, unknown>>).slice(0, 2).map((item, idx) => (
                <div key={idx} className="chat-widget__order-card-item">
                  <div className="chat-widget__order-card-item-img">
                    {item.image ? (
                      <img src={item.image as string} alt={item.name as string} />
                    ) : (
                      <Package size={16} style={{ color: 'var(--color-text-muted)' }} />
                    )}
                  </div>
                  <div className="chat-widget__order-card-item-info">
                    <span className="chat-widget__order-card-item-name">{item.name as string}</span>
                    <span className="chat-widget__order-card-item-qty">{item.quantity as number}x {formatRp(item.price as number)}</span>
                  </div>
                </div>
              ))}
              {Array.isArray(msg.metadata.items) && (msg.metadata.items as Array<unknown>).length > 2 && (
                <div className="chat-widget__order-card-more">
                  +{(msg.metadata.items as Array<unknown>).length - 2} produk lainnya
                </div>
              )}

              <div className="chat-widget__order-card-footer">
                <span className="chat-widget__order-card-total">Total: {formatRp(msg.metadata.total as number)}</span>
                <a href={`/orders/${msg.metadata.order_id as string}`} className="chat-widget__order-card-link">
                  Lihat Detail <ChevronRight size={14} />
                </a>
              </div>

              {Boolean(msg.metadata.shipping_tracking) && (
                <div className="chat-widget__order-card-tracking">
                  <Truck size={13} />
                  <span>Resi: {msg.metadata.shipping_tracking as string}</span>
                </div>
              )}
            </div>
          )}

          {/* Product Card */}
          {messageType === 'product_card' && msg.metadata && (
            <div className="chat-widget__product-card">
              <div className="chat-widget__product-card-img">
                {msg.metadata.image ? (
                  <img src={msg.metadata.image as string} alt={msg.metadata.name as string} />
                ) : (
                  <ShoppingBag size={20} style={{ color: 'var(--color-text-muted)' }} />
                )}
              </div>
              <div className="chat-widget__product-card-info">
                <span className="chat-widget__product-card-name">{msg.metadata.name as string}</span>
                <span className="chat-widget__product-card-price">{formatRp(msg.metadata.price as number)}</span>
              </div>
              {Boolean(msg.metadata.slug) && (
                <a href={`/products/${msg.metadata.slug as string}`} className="chat-widget__product-card-link">
                  Lihat <ChevronRight size={14} />
                </a>
              )}
            </div>
          )}

          {/* Text message */}
          <p className="chat-widget__msg-text">{msg.message}</p>
          <span className="chat-widget__msg-time">{formatTime(msg.created_at)}</span>
        </div>
      </div>
    )
  }

  // Generate smart quick action chips based on context
  const getQuickActions = () => {
    const actions: { key: string; label: string; icon: React.ReactNode; action: string; order?: ActiveOrder }[] = []

    if (chatContext?.active_orders && chatContext.active_orders.length > 0) {
      chatContext.active_orders.forEach((order) => {
        const statusInfo = ORDER_STATUS_LABELS[order.status]
        if (order.status === 'shipped') {
          actions.push({
            key: `track-${order.id}`,
            label: `Lacak #${order.order_number}`,
            icon: <Truck size={14} />,
            action: 'track_order',
            order,
          })
        } else {
          actions.push({
            key: `order-${order.id}`,
            label: `${statusInfo?.icon || '📦'} #${order.order_number}`,
            icon: <Package size={14} />,
            action: 'ask_order',
            order,
          })
        }
      })
    }

    // Default actions
    actions.push(
      { key: 'ask-product', label: 'Tanya Produk', icon: <ShoppingBag size={14} />, action: 'ask_product' },
      { key: 'check-order', label: 'Cek Pesanan', icon: <Package size={14} />, action: 'check_order' },
      { key: 'help', label: 'Bantuan', icon: <HelpCircle size={14} />, action: 'help' },
    )

    return actions
  }

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button onClick={handleOpen} className="chat-widget__fab" aria-label="Buka Chat">
          <MessageCircle size={24} />
          {unreadCount > 0 && (
            <span className="chat-widget__fab-badge">{unreadCount}</span>
          )}
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className={`chat-widget ${isMinimized ? 'chat-widget--minimized' : ''}`}>
          {/* Header */}
          <div className="chat-widget__header" onClick={() => isMinimized && setIsMinimized(false)}>
            <div className="chat-widget__header-info">
              <div className="chat-widget__header-avatar">
                <MessageCircle size={18} />
              </div>
              <div>
                <p className="chat-widget__header-title">Tamim Parfume</p>
                <p className="chat-widget__header-subtitle">
                  Biasanya membalas dalam beberapa menit
                </p>
              </div>
            </div>
            <div className="chat-widget__header-actions">
              <button onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized) }} className="chat-widget__header-btn">
                <Minus size={18} />
              </button>
              <button onClick={() => { setIsOpen(false) }} className="chat-widget__header-btn">
                <X size={18} />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages */}
              <div className="chat-widget__messages">
                {!userId ? (
                  <div className="chat-widget__login">
                    <MessageCircle size={40} style={{ color: 'var(--color-text-muted)', opacity: 0.3 }} />
                    <p>Silakan <a href="/login" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>login</a> untuk mulai chat</p>
                  </div>
                ) : loading ? (
                  <div className="chat-widget__loading">
                    <Loader2 size={24} className="animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="chat-widget__empty">
                    <p className="chat-widget__empty-title">👋 Halo!</p>
                    <p className="chat-widget__empty-desc">Ada yang bisa kami bantu? Pilih topik di bawah atau ketik pesan Anda.</p>

                    {/* Smart order cards for new chat */}
                    {chatContext?.active_orders && chatContext.active_orders.length > 0 && (
                      <div className="chat-widget__active-orders">
                        <p className="chat-widget__active-orders-title">Pesanan Aktif Anda:</p>
                        {chatContext.active_orders.slice(0, 3).map((order) => {
                          const statusInfo = ORDER_STATUS_LABELS[order.status]
                          return (
                            <button
                              key={order.id}
                              className="chat-widget__active-order-item"
                              onClick={() => handleQuickAction('ask_order', order)}
                            >
                              <div className="chat-widget__active-order-preview">
                                {order.items[0]?.product_image ? (
                                  <img src={order.items[0].product_image} alt="" className="chat-widget__active-order-img" />
                                ) : (
                                  <div className="chat-widget__active-order-img-placeholder">
                                    <Package size={16} />
                                  </div>
                                )}
                                <div className="chat-widget__active-order-info">
                                  <span className="chat-widget__active-order-number">#{order.order_number}</span>
                                  <span className="chat-widget__active-order-status" style={{ color: statusInfo?.color }}>
                                    {statusInfo?.icon} {statusInfo?.label}
                                  </span>
                                  <span className="chat-widget__active-order-items">
                                    {order.items.length} produk • {formatRp(order.total)}
                                  </span>
                                </div>
                              </div>
                              <ChevronRight size={16} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  messages.map((msg) => renderMessage(msg))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Smart Quick Actions Bar */}
              {userId && (
                <div className="chat-widget__context-bar">
                  {contextLoading ? (
                    <div className="chat-widget__context-loading">
                      <Loader2 size={14} className="animate-spin" />
                    </div>
                  ) : (
                    getQuickActions().map((qa) => (
                      qa.order ? (
                        // Rich order chip with product image + name
                        <button
                          key={qa.key}
                          className="chat-widget__chip-order"
                          onClick={() => handleQuickAction(qa.action, qa.order)}
                          disabled={sending}
                        >
                          <div className="chat-widget__chip-order-img">
                            {qa.order.items[0]?.product_image ? (
                              <img src={qa.order.items[0].product_image} alt="" />
                            ) : (
                              <Package size={14} />
                            )}
                          </div>
                          <div className="chat-widget__chip-order-info">
                            <span className="chat-widget__chip-order-name">
                              {qa.order.items[0]?.product_name || 'Pesanan'}
                              {qa.order.items.length > 1 && ` +${qa.order.items.length - 1}`}
                            </span>
                            <span className="chat-widget__chip-order-meta">
                              #{qa.order.order_number}
                            </span>
                          </div>
                          <ChevronRight size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                        </button>
                      ) : (
                        // Simple text chip
                        <button
                          key={qa.key}
                          className="chat-widget__chip"
                          onClick={() => handleQuickAction(qa.action, qa.order)}
                          disabled={sending}
                        >
                          {qa.icon}
                          <span>{qa.label}</span>
                        </button>
                      )
                    ))
                  )}
                </div>
              )}

              {/* Input */}
              {userId && (
                <div className="chat-widget__input">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    placeholder="Ketik pesan..."
                    className="chat-widget__input-field"
                    disabled={sending}
                  />
                  <button
                    onClick={() => handleSend()}
                    disabled={sending || !newMessage.trim()}
                    className="chat-widget__input-send"
                  >
                    {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  )
}
