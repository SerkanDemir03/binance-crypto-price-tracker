import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'

const Layout = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout

