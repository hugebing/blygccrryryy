/**
 * QRCard - QR Code 生成與顯示卡片
 * 生成付款 QR Code、短連結、複製與下載功能
 */

'use client'

import { useState, useEffect } from 'react'
import QRCodeLib from 'qrcode'
import type { Bill } from '../../types'

interface QRCardProps {
  bill: Bill
}

export default function QRCard({ bill }: QRCardProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(true)
  
  // 生成 QR Code
  useEffect(() => {
    generateQRCode()
  }, [bill])
  
  const generateQRCode = async () => {
    setIsGenerating(true)
    try {
      // 構建付款資料（只包含銷帳編號和到期時間）
      const paymentData = {
        id: bill.id,           // 銷帳編號
        deadline: bill.deadline, // 截止時間（秒）
      }
      
      // 將資料轉為 JSON 字串
      const qrContent = JSON.stringify(paymentData)
      
      // 生成 QR Code
      const qrDataUrl = await QRCodeLib.toDataURL(qrContent, {
        width: 400,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' },
        errorCorrectionLevel: 'H', // 使用最高錯誤修正等級
      })
      
      setQrCodeUrl(qrDataUrl)
    } catch (error) {
      console.error('生成 QR Code 失敗：', error)
    } finally {
      setIsGenerating(false)
    }
  }
  
  // 複製付款資料
  const handleCopyData = () => {
    const paymentData = {
      id: bill.id,
      deadline: bill.deadline,
    }
    const qrContent = JSON.stringify(paymentData, null, 2)
    navigator.clipboard.writeText(qrContent)
    alert('付款資料已複製！')
  }
  
  // 下載 QR Code (PNG)
  const handleDownloadPNG = () => {
    if (!qrCodeUrl) return
    
    const link = document.createElement('a')
    link.href = qrCodeUrl
    link.download = `payment-qr-${bill.id}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
  
  // 下載 QR Code (SVG)
  const handleDownloadSVG = async () => {
    try {
      const paymentData = {
        id: bill.id,
        deadline: bill.deadline,
      }
      const qrContent = JSON.stringify(paymentData)
      
      const svgString = await QRCodeLib.toString(qrContent, {
        type: 'svg',
        width: 400,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' },
        errorCorrectionLevel: 'H',
      })
      
      const blob = new Blob([svgString], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `payment-qr-${bill.id}.svg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('下載 SVG 失敗：', error)
      alert('下載失敗，請稍後再試')
    }
  }
  
  // 格式化時間
  const formatDeadline = () => {
    const deadline = new Date(bill.deadline * 1000)
    return deadline.toLocaleString('zh-TW', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  
  return (
    <div className="card">
      <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>
        付款 QR Code
      </h3>
      
      <div className="divider"></div>
      
      {/* QR Code 顯示 */}
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        {isGenerating ? (
          <div style={{ 
            width: '300px', 
            height: '300px', 
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0f141a',
            borderRadius: '12px'
          }}>
            <span className="loading"></span>
          </div>
        ) : (
          <div style={{ 
            background: '#fff', 
            padding: '20px', 
            borderRadius: '16px', 
            display: 'inline-block',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
          }}>
            <img 
              src={qrCodeUrl} 
              alt="Payment QR Code"
              style={{ width: '300px', height: '300px', display: 'block' }}
            />
          </div>
        )}
        
        <p className="sub" style={{ marginTop: '16px', maxWidth: '400px', margin: '16px auto 0' }}>
          付款人可以使用手機掃描此 QR Code 進行付款
        </p>
      </div>
      
      <div className="divider"></div>
      
      {/* 付款資料預覽 */}
      <div style={{ marginBottom: '20px' }}>
        <label className="sub" style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
          QR Code 內容（JSON 資料）
        </label>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
          <textarea
            value={JSON.stringify({
              id: bill.id,
              deadline: bill.deadline,
            }, null, 2)}
            readOnly
            style={{ 
              flex: 1, 
              fontFamily: 'monospace', 
              fontSize: '12px',
              background: '#0f141a',
              cursor: 'text',
              minHeight: '60px',
              resize: 'vertical'
            }}
            onClick={(e) => (e.target as HTMLTextAreaElement).select()}
          />
          <button 
            onClick={handleCopyData}
            className="btn"
            title="複製資料"
          >
            <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '18px', height: '18px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* 帳單摘要 */}
      <div style={{ marginBottom: '20px' }}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <span className="sub">銷帳編號</span>
            <div style={{ fontWeight: '700', marginTop: '4px', fontFamily: 'monospace' }}>{bill.id}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className="sub">截止時間</span>
            <div style={{ fontWeight: '700', marginTop: '4px' }}>{formatDeadline()}</div>
          </div>
        </div>
        
        <div style={{ marginTop: '12px' }}>
          <span className="sub">總金額</span>
          <div style={{ fontSize: '20px', fontWeight: '700', marginTop: '4px', fontFamily: 'monospace' }}>
            {bill.assetRules.map((rule, index) => (
              <span key={index} style={{ marginRight: '12px' }}>
                {rule.totalRequired} {rule.asset.symbol}
              </span>
            ))}
          </div>
        </div>
        
        <div style={{ marginTop: '12px' }}>
          <span className="sub">支援的鏈</span>
          <div className="row" style={{ gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
            {bill.assetRules[0]?.chainLimits.map((limit) => {
              const chains: Record<number, string> = {
                1: 'Ethereum',
                137: 'Polygon',
                8453: 'Base',
                42161: 'Arbitrum',
              }
              return (
                <span key={limit.chainId} className="chip" style={{ fontSize: '12px' }}>
                  {chains[limit.chainId] || `Chain ${limit.chainId}`}
                </span>
              )
            })}
          </div>
        </div>
      </div>
      
      <div className="divider"></div>
      
      {/* 操作按鈕 */}
      <div>
        <span className="sub" style={{ display: 'block', marginBottom: '12px', fontWeight: '600' }}>
          下載 QR Code
        </span>
        <div className="row" style={{ gap: '8px', flexWrap: 'wrap' }}>
          <button
            className="btn"
            onClick={handleDownloadPNG}
            disabled={isGenerating}
            style={{ flex: '1 1 120px' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '18px', height: '18px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            下載 PNG
          </button>
          <button
            className="btn"
            onClick={handleDownloadSVG}
            disabled={isGenerating}
            style={{ flex: '1 1 120px' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '18px', height: '18px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            下載 SVG
          </button>
          <button
            className="btn btn-primary"
            onClick={handleCopyData}
            style={{ flex: '1 1 140px' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '18px', height: '18px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            複製資料
          </button>
        </div>
      </div>
      
      
    </div>
  )
}

