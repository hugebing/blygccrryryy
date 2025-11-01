/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // 自定義金屬色
        'cyber-gold': '#FFD700',
        'cyber-silver': '#C0C0C0',
        'neon-blue': '#00D9FF',
        'electric-blue': '#0EA5E9',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-premium': 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0C4A6E 100%)',
        'gradient-card': 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
      },
      boxShadow: {
        'neon': '0 0 10px rgba(0, 217, 255, 0.5), 0 0 20px rgba(0, 217, 255, 0.3)',
        'neon-hover': '0 0 20px rgba(0, 217, 255, 0.7), 0 0 40px rgba(0, 217, 255, 0.5)',
        'gold': '0 0 10px rgba(255, 215, 0, 0.3), 0 0 20px rgba(255, 215, 0, 0.2)',
      },
    },
  },
  // DaisyUI 外掛
  plugins: [require('daisyui')],
  
  // DaisyUI 設定
  daisyui: {
    themes: [
      {
        // 🎨 自訂高級黑藍主題
        luxuryDark: {
          "primary": "#0EA5E9",           // 電藍色（主要按鈕）
          "secondary": "#00D9FF",         // 霓虹藍（次要元素）
          "accent": "#FFD700",            // 金色（強調色）
          "neutral": "#1E293B",           // 深灰藍（卡片背景）
          "base-100": "#0F172A",          // 最深藍黑色（主背景）
          "base-200": "#1E293B",          // 深藍灰（次背景）
          "base-300": "#334155",          // 中藍灰（邊框）
          "info": "#0EA5E9",              // 資訊藍
          "success": "#10B981",           // 成功綠
          "warning": "#F59E0B",           // 警告橙
          "error": "#EF4444",             // 錯誤紅
          
          // 文字顏色
          "--rounded-box": "1rem",
          "--rounded-btn": "0.5rem",
          "--rounded-badge": "1.9rem",
          "--animation-btn": "0.25s",
          "--animation-input": "0.2s",
          "--btn-focus-scale": "0.95",
          "--border-btn": "1px",
          "--tab-border": "1px",
          "--tab-radius": "0.5rem",
        },
      },
      'light',      // 保留淺色主題選項
    ],
    darkTheme: 'luxuryDark',  // 預設使用高級深色主題
    base: true,
    styled: true,
    utils: true,
  },
}


