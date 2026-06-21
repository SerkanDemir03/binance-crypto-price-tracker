import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { MessageCircle, X, Send, Bot, User } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import { chatbotAPI } from '../../services/api'

const CHATBOT_Z_INDEX = 2147483647

// **metin** -> kalın gösterim için
function formatMessageContent(text) {
  if (!text || typeof text !== 'string') return text
  const parts = text.split(/\*\*(.+?)\*\*/g)
  return parts.map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part))
}

const CHATBOT_ICON_SRC = '/chatbot_ikon.png'

/**
 * Estetik asistan ikonu – sade, okunaklı, kripto takip + sohbet teması.
 * Mavi daire içinde beyaz çizgilerle zarif görünüm.
 */
function ChatbotIcon({ size = 28, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      {/* Sohbet balonu – yumuşak köşeler, tek çizgi */}
      <path
        d="M5 6a2.5 2.5 0 0 1 2.5-2.5h9A2.5 2.5 0 0 1 19 6v6a2.5 2.5 0 0 1-2.5 2.5h-2.2l-1.6 2.4-1.6-2.4H7.5A2.5 2.5 0 0 1 5 12V6z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Yükselen trend – minimal ve net */}
      <path
        d="M8.5 11l2-1.5 1.5 1L14 9"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [iconError, setIconError] = useState(false)
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Merhaba! 👋 Ben yapay zeka kripto asistanınızım. Güncel fiyatlar, al/sat yorumu ve sorularınız için buradayım. "Yardım" yazarak neler yapabileceğinizi görebilirsiniz.',
      suggestions: ['Yardım', 'BTC fiyatı', 'BTC alınır mı?']
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const { theme } = useTheme()
  const userId = useRef(`user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)

  // Mesajlar değiştiğinde en alta scroll
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  // Chat açıldığında input'a focus
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  const handleSendMessage = async (message = null) => {
    const messageToSend = message || inputValue.trim()
    if (!messageToSend || isLoading) return

    // Kullanıcı mesajını ekle
    const userMessage = {
      role: 'user',
      content: messageToSend
    }
    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      const response = await chatbotAPI.sendMessage(messageToSend, userId.current)
      const payload = response.data?.data ?? response.data
      const text = (payload?.text ?? '').trim()
      const botMessage = {
        role: 'assistant',
        content: text || 'Yanıt alınamadı. Lütfen tekrar deneyin veya "Yardım" yazın.',
        suggestions: payload?.suggestions || [],
        data: payload?.data ?? null
      }
      setMessages(prev => [...prev, botMessage])
    } catch (error) {
      console.error('Chatbot error:', error)
      const errorMessage = {
        role: 'assistant',
        content: 'Bağlantıda kısa bir gecikme oldu. Lütfen tekrar deneyin veya "Yardım" yazarak seçenekleri görebilirsiniz.',
        suggestions: ['Yardım', 'BTC fiyatı', 'En güncel fiyatlar']
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuggestionClick = (suggestion) => {
    handleSendMessage(suggestion)
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleClearHistory = async () => {
    try {
      await chatbotAPI.clearHistory(userId.current)
      setMessages([
        {
          role: 'assistant',
          content: 'Konuşma geçmişi temizlendi. Güncel fiyat veya al/sat yorumu için örn: "BTC fiyatı", "ETH alınır mı?" yazabilirsiniz.',
          suggestions: ['Yardım', 'BTC fiyatı', 'BTC alınır mı?']
        }
      ])
    } catch (error) {
      console.error('Clear history error:', error)
    }
  }

  /* Viewport'a göre sabit: sayfa kaydırılsa bile her zaman görünür (body'ye portal + fixed) */
  const chatbotUI = (
    <div
      role="presentation"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        zIndex: CHATBOT_Z_INDEX
      }}
    >
      {/* Buton - sağ alt, tıklanabilir */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            width: '56px',
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            backgroundColor: '#2563eb',
            color: '#fff',
            border: 'none',
            boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4), 0 0 0 2px rgba(255,255,255,0.15)',
            cursor: 'pointer',
            pointerEvents: 'auto'
          }}
          className="hover:opacity-95 hover:scale-[1.04] active:scale-[0.98] transition-all duration-200"
          aria-label="Yapay zeka asistanını aç"
        >
          <ChatbotIcon size={30} />
        </button>
      )}

      {/* Pencere - viewport'ta sabit, sayfa kaydırılsa da yerinde */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            bottom: '24px',
            right: '24px',
            pointerEvents: 'auto'
          }}
          className={`w-96 h-[600px] rounded-2xl shadow-2xl flex flex-col transition-all duration-300 overflow-hidden ${
            theme === 'dark'
              ? 'bg-gray-800/95 border border-amber-500/30'
              : 'bg-white/95 border border-amber-400/40'
          }`}
        >
          {/* Header - kripto/ikon uyumlu gradient */}
          <div
            className="flex items-center justify-between p-4 rounded-t-2xl"
            style={{
              background: theme === 'dark'
                ? 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0c4a6e 100%)'
                : 'linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #3b82f6 100%)',
              boxShadow: '0 2px 12px rgba(0,0,0,0.15)'
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-8 rounded-lg bg-white/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                {!iconError ? (
                  <img src={CHATBOT_ICON_SRC} alt="" className="w-6 h-5 object-contain" onError={() => setIconError(true)} />
                ) : (
                  <Bot size={18} className="text-white" />
                )}
              </div>
              <h3 className="text-white font-semibold text-sm">Yapay Zeka Kripto Asistanı</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleClearHistory}
                className="text-white/90 hover:text-white text-xs px-2 py-1 rounded-lg hover:bg-white/10 transition-colors"
                title="Geçmişi temizle"
              >
                Temizle
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/90 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Kapat"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Messages Container - kripto temalı arka plan */}
          <div
            className="flex-1 overflow-y-auto p-4 space-y-4"
            style={{
              background: theme === 'dark'
                ? 'linear-gradient(180deg, rgba(15,23,42,0.97) 0%, rgba(30,41,59,0.95) 100%)'
                : 'linear-gradient(180deg, rgba(248,250,252,0.98) 0%, rgba(241,245,249,0.98) 100%)'
            }}
          >
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-6 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden bg-gradient-to-br from-blue-600 to-blue-700 ring-1 ring-amber-400/20">
                    {!iconError ? (
                      <img src={CHATBOT_ICON_SRC} alt="" className="w-5 h-4 object-contain" onError={() => setIconError(true)} />
                    ) : (
                      <Bot size={14} className="text-white" />
                    )}
                  </div>
                )}
                <div className="flex flex-col max-w-[80%]">
                <div
                  className={`rounded-xl px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-md'
                      : theme === 'dark'
                        ? 'bg-slate-700/90 text-gray-100 border border-slate-600/50'
                        : 'bg-slate-100 text-gray-900 border border-amber-200/60'
                  }`}
                >
                    <p className="whitespace-pre-wrap text-sm">{formatMessageContent(message.content)}</p>
                  </div>
                  {message.suggestions && message.suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {message.suggestions.map((suggestion, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className={`text-xs px-3 py-1 rounded-full transition-colors ${
                            theme === 'dark'
                              ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                              : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                          }`}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {message.role === 'user' && (
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      theme === 'dark' ? 'bg-gray-600' : 'bg-gray-400'
                    }`}
                  >
                    <User size={16} className="text-white" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-6 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden bg-gradient-to-br from-blue-600 to-blue-700 ring-1 ring-amber-400/20">
                  {!iconError ? (
                    <img src={CHATBOT_ICON_SRC} alt="" className="w-5 h-4 object-contain" onError={() => setIconError(true)} />
                  ) : (
                    <Bot size={14} className="text-white" />
                  )}
                </div>
                <div
                  className={`rounded-lg px-4 py-2 ${
                    theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
                  }`}
                >
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Container - ikon/kripto uyumlu */}
          <div
            className={`p-4 border-t ${
              theme === 'dark' ? 'border-amber-500/20 bg-slate-900/50' : 'border-amber-400/30 bg-slate-50/80'
            }`}
          >
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Mesajınızı yazın..."
                disabled={isLoading}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 ${
                  theme === 'dark'
                    ? 'bg-slate-700/80 text-gray-100 placeholder-gray-400 border border-slate-600'
                    : 'bg-white text-gray-900 placeholder-gray-500 border border-amber-200/60'
                }`}
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={isLoading || !inputValue.trim()}
                className={`px-4 py-2.5 rounded-xl transition-all ${
                  isLoading || !inputValue.trim()
                    ? 'bg-slate-400 text-slate-200 cursor-not-allowed'
                    : 'bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md'
                }`}
              >
                <Send size={18} />
              </button>
            </div>
            <div className={`mt-3 pt-3 border-t ${theme === 'dark' ? 'border-slate-700' : 'border-amber-200/40'}`}>
              <p className={`text-xs text-center leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                ⚠️ Bu uygulama yatırım tavsiyesi niteliğinde değildir.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  return createPortal(chatbotUI, document.body)
}

export default Chatbot

