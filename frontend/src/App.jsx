import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import { Toaster } from 'react-hot-toast'
import { ThemeProvider } from './contexts/ThemeContext'
import Layout from './components/Layout/Layout'
import Chatbot from './components/Chatbot/Chatbot'
import DashboardPage from './pages/Dashboard/DashboardPage'
import CryptoDetailPage from './pages/CryptoDetail/CryptoDetailPage'
import DatabaseManagementPage from './pages/Database/DatabaseManagementPage'
import NotesPage from './pages/Notes/NotesPage'
import CalculatorPage from './pages/Calculator/CalculatorPage'
import NewsPage from './pages/News/NewsPage'
import HelpPage from './pages/Help/HelpPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 2,
      staleTime: 30000, // 30 saniye cache kullan (sayfa yeniden açıldığında hızlı yükleme)
      cacheTime: 300000, // 5 dakika cache'te tut
    },
  },
})

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <Router>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<DashboardPage />} />
              <Route path="crypto/:symbol" element={<CryptoDetailPage />} />
              <Route path="database" element={<DatabaseManagementPage />} />
              <Route path="notes" element={<NotesPage />} />
              <Route path="calculator" element={<CalculatorPage />} />
              <Route path="news" element={<NewsPage />} />
              <Route path="help" element={<HelpPage />} />
            </Route>
          </Routes>
        </Router>
        <Toaster position="top-right" />
        <Chatbot />
      </QueryClientProvider>
    </ThemeProvider>
  )
}

export default App

