import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import { Toaster } from 'react-hot-toast'
import Layout from './components/Layout/Layout'
import DashboardPage from './pages/Dashboard/DashboardPage'
import CryptoDetailPage from './pages/CryptoDetail/CryptoDetailPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="crypto/:symbol" element={<CryptoDetailPage />} />
          </Route>
        </Routes>
      </Router>
      <Toaster position="top-right" />
    </QueryClientProvider>
  )
}

export default App

