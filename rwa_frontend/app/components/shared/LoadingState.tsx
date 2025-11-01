/**
 * LoadingState - 載入狀態元件
 * 骨架屏與載入動畫
 */

'use client'

interface LoadingStateProps {
  type?: 'spinner' | 'skeleton' | 'pulse'
  message?: string
  className?: string
}

export default function LoadingState({ 
  type = 'spinner', 
  message,
  className = '' 
}: LoadingStateProps) {
  if (type === 'skeleton') {
    return (
      <div className={`card ${className}`}>
        <div className="li" style={{ marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#0f141a' }}></div>
            <div style={{ flex: 1 }}>
              <div style={{ height: '16px', width: '60%', background: '#0f141a', borderRadius: '4px', marginBottom: '8px' }}></div>
              <div style={{ height: '12px', width: '40%', background: '#0f141a', borderRadius: '4px' }}></div>
            </div>
          </div>
        </div>
        <div className="li" style={{ marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#0f141a' }}></div>
            <div style={{ flex: 1 }}>
              <div style={{ height: '16px', width: '50%', background: '#0f141a', borderRadius: '4px', marginBottom: '8px' }}></div>
              <div style={{ height: '12px', width: '30%', background: '#0f141a', borderRadius: '4px' }}></div>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  if (type === 'pulse') {
    return (
      <div className={`card ${className}`} style={{ textAlign: 'center', padding: '40px' }}>
        <div className="loading" style={{ margin: '0 auto 16px' }}></div>
        {message && <p className="muted">{message}</p>}
      </div>
    )
  }
  
  // Default: spinner
  return (
    <div className={`flex items-center justify-center gap-3 ${className}`}>
      <span className="loading"></span>
      {message && <span className="sub">{message}</span>}
    </div>
  )
}

