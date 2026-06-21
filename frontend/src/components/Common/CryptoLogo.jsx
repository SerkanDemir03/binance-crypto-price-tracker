import React from 'react'

const CryptoLogo = ({ className = '', size = 'md', animated = true }) => {
  // Determine sizes based on presets
  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  }

  const selectedSize = sizeClasses[size] || size

  return (
    <div className={`relative flex items-center justify-center ${selectedSize} ${className} group`}>
      {/* Dynamic backdrop neon glow */}
      <div className={`absolute inset-0 bg-gradient-to-br from-primary-500/40 via-purple-500/40 to-pink-500/40 rounded-xl blur-xl opacity-50 group-hover:opacity-85 transition-opacity duration-500 ${animated ? 'animate-pulse' : ''}`} />
      
      {/* Main SVG Logo */}
      <svg
        className={`relative w-full h-full transform transition-all duration-500 group-hover:scale-110 group-hover:rotate-3`}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Main diamond crystal gradient */}
          <linearGradient id="crystalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" /> {/* Electric Blue */}
            <stop offset="35%" stopColor="#8b5cf6" /> {/* Deep Purple */}
            <stop offset="70%" stopColor="#ec4899" /> {/* Hot Pink */}
            <stop offset="100%" stopColor="#f59e0b" /> {/* Amber Gold */}
          </linearGradient>

          {/* Upward market trend line gradient */}
          <linearGradient id="trendGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" /> {/* Emerald Green */}
            <stop offset="100%" stopColor="#34d399" /> {/* Mint Green */}
          </linearGradient>

          {/* Golden glow filter */}
          <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* 1. Outer Diamond Border / Facets (Fitted to user's 'elmas' request, but modernized) */}
        <path
          d="M50 5 L88 28 L88 72 L50 95 L12 72 L12 28 Z"
          fill="url(#crystalGrad)"
          fillOpacity="0.08"
          stroke="url(#crystalGrad)"
          strokeWidth="3"
          strokeLinejoin="round"
          className={animated ? "animate-pulse" : ""}
          style={{ animationDuration: '4s' }}
        />

        {/* 2. Inner Crystal Geometry (3D facet lines) */}
        <path
          d="M50 5 L50 48 L88 28 M50 95 L50 48 L12 72 M12 28 L50 48 M88 72 L50 48"
          stroke="url(#crystalGrad)"
          strokeWidth="1.5"
          strokeDasharray="2 3"
          opacity="0.6"
        />

        {/* 3. Floating Node Center (Core Blockchain Block) */}
        <path
          d="M50 32 L64 40 L64 56 L50 64 L36 56 L36 40 Z"
          fill="url(#crystalGrad)"
          fillOpacity="0.25"
          stroke="url(#crystalGrad)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* 4. Bold Upward Market Trend Graph Arrow (Cutting through the crystal) */}
        <path
          d="M28 62 L42 50 L56 58 L74 36"
          stroke="url(#trendGrad)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#goldGlow)"
          className="transition-all duration-300 group-hover:stroke-yellow-400"
        />
        
        {/* Arrow Head */}
        <path
          d="M62 36 H74 V48"
          stroke="url(#trendGrad)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#goldGlow)"
          className="transition-all duration-300 group-hover:stroke-yellow-400"
        />

        {/* 5. Glowing Accent Vertex Dots */}
        <circle cx="50" cy="5" r="4.5" fill="#3b82f6" className="animate-ping" style={{ animationDuration: '3s' }} />
        <circle cx="50" cy="5" r="3.5" fill="#60a5fa" />
        
        <circle cx="88" cy="28" r="3.5" fill="#8b5cf6" />
        <circle cx="88" cy="72" r="3.5" fill="#d946ef" />
        
        <circle cx="50" cy="95" r="4.5" fill="#f59e0b" className="animate-ping" style={{ animationDuration: '4s' }} />
        <circle cx="50" cy="95" r="3.5" fill="#fbbf24" />
        
        <circle cx="12" cy="72" r="3.5" fill="#ec4899" />
        <circle cx="12" cy="28" r="3.5" fill="#3b82f6" />
      </svg>
    </div>
  )
}

export default CryptoLogo
