import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Chatbot from '../Chatbot/Chatbot'

const Layout = () => {
  return (
    <div className="min-h-screen transition-colors duration-300 bg-transparent relative z-10">
      <Navbar />
      <main className="container mx-auto px-4 py-8 relative z-10 min-h-[80vh] rounded-2xl bg-white dark:bg-gray-900 shadow-xl border border-gray-200 dark:border-gray-700">
        <Outlet />
      </main>
      <Chatbot />
    </div>
  )
}

export default Layout

