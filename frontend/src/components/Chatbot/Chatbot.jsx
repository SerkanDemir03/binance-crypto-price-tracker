import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Bot, User } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import { chatbotAPI } from '../../services/api'

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Merhaba! 👋 Ben kripto para asistanınızım. Size nasıl yardımcı olabilirim?',
      suggestions: ['Yardım', 'BTC fiyatı', 'Bitcoin nedir?']
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
      const botMessage = {
        role: 'assistant',
        content: response.data.text,
        suggestions: response.data.suggestions || [],
        data: response.data.data || null
      }
      setMessages(prev => [...prev, botMessage])
    } catch (error) {
      console.error('Chatbot error:', error)
      const errorMessage = {
        role: 'assistant',
        content: 'Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.',
        suggestions: ['Yardım', 'BTC fiyatı']
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
          content: 'Konuşma geçmişi temizlendi. Size nasıl yardımcı olabilirim?',
          suggestions: ['Yardım', 'BTC fiyatı', 'Bitcoin nedir?']
        }
      ])
    } catch (error) {
      console.error('Clear history error:', error)
    }
  }

  return (
    <>
      {/* Chatbot Button - Sağ alt köşede sabit */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999 }}
          className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110 ${
            theme === 'dark'
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
          aria-label="Chatbot'u aç"
        >
          <MessageCircle size={24} />
        </button>
      )}

      {/* Chatbot Window */}
      {isOpen && (
        <div
          style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999 }}
          className={`w-96 h-[600px] rounded-lg shadow-2xl flex flex-col transition-all duration-300 ${
            theme === 'dark'
              ? 'bg-gray-800 border border-gray-700'
              : 'bg-white border border-gray-200'
          }`}
        >
          {/* Header */}
          <div
            className={`flex items-center justify-between p-4 rounded-t-lg ${
              theme === 'dark' ? 'bg-gray-900' : 'bg-blue-600'
            }`}
          >
            <div className="flex items-center gap-2">
              <Bot size={20} className="text-white" />
              <h3 className="text-white font-semibold">Kripto Asistanı</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleClearHistory}
                className="text-white hover:text-gray-200 text-xs px-2 py-1 rounded transition-colors"
                title="Geçmişi temizle"
              >
                Temizle
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white hover:text-gray-200 transition-colors"
                aria-label="Chatbot'u kapat"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      theme === 'dark' ? 'bg-blue-600' : 'bg-blue-500'
                    }`}
                  >
                    <Bot size={16} className="text-white" />
                  </div>
                )}
                <div className="flex flex-col max-w-[80%]">
                  <div
                    className={`rounded-lg px-4 py-2 ${
                      message.role === 'user'
                        ? theme === 'dark'
                          ? 'bg-blue-600 text-white'
                          : 'bg-blue-600 text-white'
                        : theme === 'dark'
                        ? 'bg-gray-700 text-gray-100'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-sm">{message.content}</p>
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
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    theme === 'dark' ? 'bg-blue-600' : 'bg-blue-500'
                  }`}
                >
                  <Bot size={16} className="text-white" />
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

          {/* Input Container */}
          <div
            className={`p-4 border-t ${
              theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
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
                className={`flex-1 px-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  theme === 'dark'
                    ? 'bg-gray-700 text-gray-100 placeholder-gray-400'
                    : 'bg-gray-100 text-gray-900 placeholder-gray-500'
                }`}
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={isLoading || !inputValue.trim()}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  isLoading || !inputValue.trim()
                    ? theme === 'dark'
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-300 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                <Send size={18} />
              </button>
            </div>
            {/* Yasal Uyarı */}
            <div className={`mt-3 pt-3 border-t ${
              theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <p className={`text-xs text-center leading-relaxed ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}>
                ⚠️ Bu uygulama yatırım tavsiyesi niteliğinde değildir; bu sayede kullanıcı sorumluluğu konusunda şeffaflık sağlandı.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Chatbot

