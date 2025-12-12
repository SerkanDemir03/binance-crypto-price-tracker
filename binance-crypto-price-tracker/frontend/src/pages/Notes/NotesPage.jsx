import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { cryptoAPI } from '../../services/api'
import LoadingSpinner from '../../components/Common/LoadingSpinner'
import { Plus, Edit, Trash2, Search, X, Save, FileText, Tag } from 'lucide-react'
import toast from 'react-hot-toast'

const NotesPage = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [editingNote, setEditingNote] = useState(null)
  const [formData, setFormData] = useState({ title: '', content: '' })
  
  const queryClient = useQueryClient()
  const userId = 'default'

  const { data: notesResponse, isLoading, isError, error } = useQuery(
    ['notes', userId, searchTerm],
    async () => {
      // Arama terimini normalize et (trim ve boşlukları temizle)
      const normalizedSearch = searchTerm?.trim() || undefined
      const response = await cryptoAPI.getNotes(userId, { search: normalizedSearch })
      // Axios response.data içinde backend response'u var
      // Backend: { status: 'success', data: notes[], count: number }
      // Axios: response.data = { status: 'success', data: notes[], count: number }
      return response.data
    },
    { 
      refetchOnWindowFocus: false,
      retry: 1,
      onError: (error) => {
        console.error('Notes fetch error:', error)
        console.error('Error details:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        })
      },
      onSuccess: (data) => {
        console.log('Notes loaded successfully:', data)
      }
    }
  )

  // Extract notes array from response
  const notes = notesResponse?.data || []

  const createMutation = useMutation(cryptoAPI.createNote, {
    onSuccess: () => {
      queryClient.invalidateQueries(['notes'])
      setIsCreating(false)
      setFormData({ title: '', content: '' })
      toast.success('Not başarıyla oluşturuldu')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Not oluşturulurken hata oluştu')
    }
  })

  const updateMutation = useMutation(
    ({ id, data }) => cryptoAPI.updateNote(id, { ...data, userId }),
    {
      onSuccess: () => {
      queryClient.invalidateQueries(['notes'])
      setEditingNote(null)
      setFormData({ title: '', content: '' })
      toast.success('Not başarıyla güncellendi')
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Not güncellenirken hata oluştu')
      }
    }
  )

  const deleteMutation = useMutation(
    (id) => cryptoAPI.deleteNote(id, userId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['notes'])
        toast.success('Not başarıyla silindi')
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Not silinirken hata oluştu')
      }
    }
  )

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (editingNote) {
      updateMutation.mutate({
        id: editingNote.id,
        data: {
          title: formData.title,
          content: formData.content
        }
      })
    } else {
      createMutation.mutate({
        title: formData.title,
        content: formData.content,
        userId
      })
    }
  }

  const handleEdit = (note) => {
    setEditingNote(note)
    setFormData({
      title: note.title,
      content: note.content || ''
    })
    setIsCreating(true)
  }

  const handleDelete = (id) => {
    if (window.confirm('Bu notu silmek istediğinize emin misiniz?')) {
      deleteMutation.mutate(id)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Tarih yok'
    try {
      return new Date(dateString).toLocaleString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (error) {
      console.error('Date format error:', error)
      return 'Geçersiz tarih'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Not Defteri</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Kripto para notlarınızı burada saklayın
              {notes && Array.isArray(notes) && notes.length > 0 && (
                <span className="ml-2 text-blue-600 dark:text-blue-400 font-medium">
                  ({notes.length} {notes.length === 1 ? 'not' : 'not'})
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => {
              setIsCreating(true)
              setEditingNote(null)
              setFormData({ title: '', content: '' })
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-md hover:shadow-lg font-medium"
          >
            <Plus size={20} />
            Yeni Not
          </button>
        </div>

        {/* Search Filter */}
        <div className="mb-6">
          <div className="flex-1 relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Not başlığı veya içeriğinde ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>
          {searchTerm && (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Arama: Not başlığı ve içeriğinde "{searchTerm}" aranıyor...
            </p>
          )}
        </div>

        {/* Create/Edit Form */}
        {isCreating && (
          <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {editingNote ? 'Notu Düzenle' : 'Yeni Not'}
              </h2>
              <button
                onClick={() => {
                  setIsCreating(false)
                  setEditingNote(null)
                  setFormData({ title: '', content: '' })
                }}
                className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                title="Kapat"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Not Başlığı <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Örn: Bitcoin Analizi"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Not İçeriği
                </label>
                <textarea
                  placeholder="Notunuzun detaylarını buraya yazın..."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={6}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={createMutation.isLoading || updateMutation.isLoading}
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  <Save size={18} />
                  {editingNote ? 'Güncelle' : 'Kaydet'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false)
                    setEditingNote(null)
                    setFormData({ title: '', content: '' })
                  }}
                  className="px-6 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition font-medium"
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Notes List */}
        {isLoading ? (
          <LoadingSpinner />
        ) : isError ? (
          <div className="col-span-full text-center py-12">
            <FileText className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-red-600 dark:text-red-400 mb-2">Notlar yüklenirken hata oluştu</p>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {error?.response?.data?.message || error?.message || 'Bilinmeyen bir hata oluştu'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {!notes || (Array.isArray(notes) && notes.length === 0) ? (
              <div className="col-span-full text-center py-12">
                <FileText className="mx-auto text-gray-400 mb-4" size={48} />
                <p className="text-gray-600 dark:text-gray-400">Henüz not yok</p>
                <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">Yeni not eklemek için "Yeni Not" butonuna tıklayın</p>
              </div>
            ) : Array.isArray(notes) ? (
              notes.map((note) => (
                <div
                  key={note.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 p-6 border border-gray-200 dark:border-gray-700 flex flex-col h-full"
                >
                  {/* Header with title and actions */}
                  <div className="flex justify-between items-start mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white pr-2 flex-1">
                      {note.title}
                    </h3>
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleEdit(note)}
                        className="p-1.5 text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition"
                        title="Düzenle"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(note.id)}
                        className="p-1.5 text-red-600 hover:text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition"
                        title="Sil"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 mb-4">
                    {note.content ? (
                      <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed line-clamp-4">
                        {note.content}
                      </p>
                    ) : (
                      <p className="text-gray-400 dark:text-gray-500 text-sm italic">
                        İçerik yok
                      </p>
                    )}
                  </div>
                  
                  {/* Footer with date */}
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-700 mt-auto">
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      {formatDate(note.updated_at)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <FileText className="mx-auto text-gray-400 mb-4" size={48} />
                <p className="text-red-600 dark:text-red-400 mb-2">Veri formatı hatası</p>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Beklenmeyen veri formatı. Lütfen sayfayı yenileyin.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Sayfayı Yenile
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default NotesPage

