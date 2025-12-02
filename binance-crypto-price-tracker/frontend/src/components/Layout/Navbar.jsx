import { Link } from 'react-router-dom'
import { TrendingUp, Sparkles, Database, Moon, Sun } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'

const Navbar = () => {
  const { theme, toggleTheme } = useTheme()

  return (
    <nav className="bg-gradient-to-r from-primary-600 via-primary-500 to-primary-600 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 shadow-lg">
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
                Serkan Crypto Tracker
                <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
              </span>
              <p className="text-xs text-primary-100 dark:text-gray-300">Gerçek zamanlı kripto para takibi</p>
            </div>
          </Link>
          
          <div className="flex items-center space-x-4">
            <Link
              to="/"
              className="px-4 py-2 text-white hover:text-yellow-200 dark:hover:text-yellow-300 transition-colors font-medium rounded-lg hover:bg-white/10"
            >
              Dashboard
            </Link>
            <Link
              to="/database"
              className="px-4 py-2 text-white hover:text-yellow-200 dark:hover:text-yellow-300 transition-colors font-medium rounded-lg hover:bg-white/10 flex items-center gap-2"
            >
              <Database className="w-4 h-4" />
              Veritabanı
            </Link>
            
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 text-white hover:text-yellow-200 dark:hover:text-yellow-300 transition-colors rounded-lg hover:bg-white/10 flex items-center justify-center"
              title={theme === 'light' ? 'Dark mode\'a geç' : 'Light mode\'a geç'}
            >
              {theme === 'light' ? (
                <Moon className="w-5 h-5" />
              ) : (
                <Sun className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar

