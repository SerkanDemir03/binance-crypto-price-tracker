import { Link } from 'react-router-dom'
import { TrendingUp, Sparkles, Database, Moon, Sun, FileText, Calculator, Newspaper, HelpCircle } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import CryptoLogo from '../Common/CryptoLogo'

const Navbar = () => {
  const { theme, toggleTheme } = useTheme()

  return (
    <nav className="bg-gradient-to-r from-primary-600 via-primary-500 to-primary-600 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-3 group">
            <CryptoLogo size="sm" />
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
            <Link
              to="/notes"
              className="px-4 py-2 text-white hover:text-yellow-200 dark:hover:text-yellow-300 transition-colors font-medium rounded-lg hover:bg-white/10 flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Notlar
            </Link>
            <Link
              to="/calculator"
              className="px-4 py-2 text-white hover:text-yellow-200 dark:hover:text-yellow-300 transition-colors font-medium rounded-lg hover:bg-white/10 flex items-center gap-2"
            >
              <Calculator className="w-4 h-4" />
              Hesap Makinesi
            </Link>
            <Link
              to="/news"
              className="px-4 py-2 text-white hover:text-yellow-200 dark:hover:text-yellow-300 transition-colors font-medium rounded-lg hover:bg-white/10 flex items-center gap-2"
            >
              <Newspaper className="w-4 h-4" />
              Haberler
            </Link>
            <Link
              to="/help"
              className="px-4 py-2 text-white hover:text-yellow-200 dark:hover:text-yellow-300 transition-colors font-medium rounded-lg hover:bg-white/10 flex items-center gap-2"
            >
              <HelpCircle className="w-4 h-4" />
              Yardım
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

