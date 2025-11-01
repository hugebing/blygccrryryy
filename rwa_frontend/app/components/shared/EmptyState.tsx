/**
 * EmptyState - 空狀態元件
 * 顯示友善的空狀態提示
 */

'use client'

interface EmptyStateProps {
  icon?: 'bill' | 'vault' | 'list' | 'search'
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export default function EmptyState({ 
  icon = 'list',
  title, 
  description, 
  action,
  className = '' 
}: EmptyStateProps) {
  const icons = {
    bill: (
      <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '64px', height: '64px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    vault: (
      <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '64px', height: '64px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
    list: (
      <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '64px', height: '64px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    ),
    search: (
      <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '64px', height: '64px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  }
  
  return (
    <div className={`card ${className}`} style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ color: 'var(--muted)', marginBottom: '20px', opacity: 0.5 }}>
        {icons[icon]}
      </div>
      
      <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px', color: 'var(--text)' }}>
        {title}
      </h3>
      
      {description && (
        <p className="sub" style={{ marginBottom: '24px', maxWidth: '400px', margin: '0 auto 24px' }}>
          {description}
        </p>
      )}
      
      {action && (
        <button 
          onClick={action.onClick}
          className="btn btn-primary"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

