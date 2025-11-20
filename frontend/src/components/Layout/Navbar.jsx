import { Link } from 'react-router-dom'
import { TrendingUp, Sparkles } from 'lucide-react'

const Navbar = () => {
  return (
    <nav className="bg-gradient-to-r from-primary-600 via-primary-500 to-primary-600 shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-white rounded-lg blur-md opacity-30 group-hover:opacity-50 transition-opacity"></div>
              <div className="relative bg-white/20 backdrop-blur-sm rounded-lg p-2 group-hover:scale-110 transition-transform duration-300">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <span className="text-xl font-bold text-white flex items-center gap-2">
                Binance Crypto Tracker
                <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
              </span>
              <p className="text-xs text-primary-100">Gerçek zamanlı kripto para takibi</p>
            </div>
          </Link>
          
          <div className="flex items-center space-x-4">
            <Link
              to="/"
              className="px-4 py-2 text-white hover:text-yellow-200 transition-colors font-medium rounded-lg hover:bg-white/10"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar

