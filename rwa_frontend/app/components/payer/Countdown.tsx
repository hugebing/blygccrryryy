/**
 * Countdown - 倒數計時元件
 * 顯示距離截止時間的倒數
 */

'use client'

import { useEffect, useState } from 'react'

interface CountdownProps {
  deadline: number // Unix timestamp (秒)
  onExpired?: () => void
}

export default function Countdown({ deadline, onExpired }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0)
  
  useEffect(() => {
    const updateCountdown = () => {
      const now = Math.floor(Date.now() / 1000)
      const remaining = deadline - now
      
      if (remaining <= 0) {
        setTimeLeft(0)
        onExpired?.()
      } else {
        setTimeLeft(remaining)
      }
    }
    
    // 立即更新一次
    updateCountdown()
    
    // 每秒更新
    const interval = setInterval(updateCountdown, 1000)
    
    return () => clearInterval(interval)
  }, [deadline, onExpired])
  
  // 格式化時間
  const formatTime = () => {
    if (timeLeft <= 0) {
      return { hours: 0, minutes: 0, seconds: 0 }
    }
    
    const hours = Math.floor(timeLeft / 3600)
    const minutes = Math.floor((timeLeft % 3600) / 60)
    const seconds = timeLeft % 60
    
    return { hours, minutes, seconds }
  }
  
  const { hours, minutes, seconds } = formatTime()
  
  // 根據剩餘時間決定顏色
  const getColorClass = () => {
    if (timeLeft <= 0) return 'error'
    if (timeLeft < 300) return 'warning' // 少於 5 分鐘警告
    if (timeLeft < 600) return 'info'    // 少於 10 分鐘提示
    return 'success'                      // 充足時間
  }
  
  const colorClass = getColorClass()
  
  return (
    <div 
      className="card" 
      style={{ 
        background: `var(--${colorClass}-dim)`,
        border: `2px solid var(--${colorClass})`,
        textAlign: 'center',
        padding: '20px'
      }}
    >
      <div className="sub" style={{ marginBottom: '12px', fontWeight: '600', color: `var(--${colorClass})` }}>
        {timeLeft <= 0 ? '已截止' : '剩餘時間'}
      </div>
      
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: '16px',
        flexWrap: 'wrap'
      }}>
        {/* 小時 */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            fontSize: '36px', 
            fontWeight: '800', 
            fontFamily: 'monospace',
            lineHeight: '1',
            color: `var(--${colorClass})`
          }}>
            {String(hours).padStart(2, '0')}
          </div>
          <div className="sub" style={{ marginTop: '4px', fontSize: '11px' }}>
            時
          </div>
        </div>
        
        <div style={{ fontSize: '36px', fontWeight: '800', color: `var(--${colorClass})`, lineHeight: '1' }}>
          :
        </div>
        
        {/* 分鐘 */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            fontSize: '36px', 
            fontWeight: '800', 
            fontFamily: 'monospace',
            lineHeight: '1',
            color: `var(--${colorClass})`
          }}>
            {String(minutes).padStart(2, '0')}
          </div>
          <div className="sub" style={{ marginTop: '4px', fontSize: '11px' }}>
            分
          </div>
        </div>
        
        <div style={{ fontSize: '36px', fontWeight: '800', color: `var(--${colorClass})`, lineHeight: '1' }}>
          :
        </div>
        
        {/* 秒 */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            fontSize: '36px', 
            fontWeight: '800', 
            fontFamily: 'monospace',
            lineHeight: '1',
            color: `var(--${colorClass})`
          }}>
            {String(seconds).padStart(2, '0')}
          </div>
          <div className="sub" style={{ marginTop: '4px', fontSize: '11px' }}>
            秒
          </div>
        </div>
      </div>
      
      {timeLeft > 0 && timeLeft < 600 && (
        <div style={{ marginTop: '12px', fontSize: '12px', color: `var(--${colorClass})` }}>
          {timeLeft < 300 ? '⚠️ 即將截止，請盡快完成付款' : '請注意截止時間'}
        </div>
      )}
      
      {timeLeft <= 0 && (
        <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--error)' }}>
          此帳單已過期
        </div>
      )}
    </div>
  )
}

