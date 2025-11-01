/**
 * QR Code 掃描頁面 - /scan
 * 付款人掃描 QR Code 並解析付款資訊
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import jsQR from 'jsqr'
import MerchantLayout from '../components/layouts/MerchantLayout'
import { getBillById } from '../services/mockData'

export default function ScanPage() {
  const router = useRouter()
  const [scannedData, setScannedData] = useState<string>('')
  const [billId, setBillId] = useState<string>('')
  const [deadline, setDeadline] = useState<number>(0)
  const [error, setError] = useState<string>('')
  const [isScanning, setIsScanning] = useState(false)
  const [scanSuccess, setScanSuccess] = useState(false)
  const [scanStatus, setScanStatus] = useState<string>('未開始')
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<number | null>(null)

  // 清理相機資源
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      if (scanIntervalRef.current) {
        cancelAnimationFrame(scanIntervalRef.current)
      }
    }
  }, [])

  // QR Code 掃描邏輯
  const scanQRCode = () => {
    if (!videoRef.current || !canvasRef.current) {
      console.log('視頻或 Canvas 不存在')
      setScanStatus('錯誤：視頻或 Canvas 不存在')
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context) {
      console.log('無法獲取 Canvas context')
      setScanStatus('錯誤：無法獲取 Canvas context')
      return
    }

    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      console.log('視頻尚未準備好，readyState:', video.readyState)
      setScanStatus(`等待視頻準備 (${video.readyState}/4)`)
      scanIntervalRef.current = requestAnimationFrame(scanQRCode)
      return
    }

    // 設置 canvas 尺寸與視頻相同
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    if (canvas.width === 0 || canvas.height === 0) {
      console.log('視頻尺寸為 0')
      setScanStatus('等待視頻尺寸')
      scanIntervalRef.current = requestAnimationFrame(scanQRCode)
      return
    }

    setScanStatus(`正在掃描 (${canvas.width}x${canvas.height})`)

    // 繪製當前幀到 canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // 獲取圖像數據
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)

    // 使用 jsQR 掃描
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    })

    if (code) {
      // 掃描成功！
      console.log('✅ QR Code 掃描成功:', code.data)
      setScanStatus('✅ 掃描成功！')
      setScanSuccess(true)
      setScannedData(code.data)
      handleStopCamera()
      
      // 自動解析並跳轉
      try {
        const parsed = JSON.parse(code.data)
        if (parsed.id && parsed.deadline) {
          setBillId(parsed.id)
          setDeadline(parsed.deadline)
          setError('')
          console.log('✅ 解析成功，準備跳轉:', parsed)
          
          // 顯示成功訊息後自動跳轉
          setTimeout(() => {
            router.push(`/i/${parsed.id}`)
          }, 1500) // 1.5秒後自動跳轉
        } else {
          setError('QR Code 格式不正確，缺少必要欄位')
          setScanSuccess(false)
        }
      } catch (err) {
        setError('無法解析 QR Code，請確認格式正確')
        setScanSuccess(false)
        console.error('解析錯誤:', err)
      }
      return
    }

    // 繼續掃描
    scanIntervalRef.current = requestAnimationFrame(scanQRCode)
  }

  // 開啟相機掃描
  const handleStartCamera = async () => {
    try {
      console.log('📷 開始開啟相機...')
      setError('')
      setBillId('')
      setDeadline(0)
      setScanSuccess(false)
      setScanStatus('請求相機權限...')
      setIsScanning(true)
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', // 使用後置相機
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      })
      
      console.log('✅ 相機開啟成功')
      setScanStatus('相機已開啟')
      streamRef.current = stream
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        
        // 等待視頻元數據加載
        videoRef.current.onloadedmetadata = () => {
          console.log('✅ 視頻元數據已加載')
          setScanStatus('視頻元數據已加載')
          videoRef.current?.play().then(() => {
            console.log('✅ 視頻開始播放，啟動掃描')
            setScanStatus('視頻播放中，準備掃描...')
            // 延遲一點開始掃描，確保視頻已準備好
            setTimeout(() => {
              console.log('🔍 開始掃描循環')
              scanQRCode()
            }, 500)
          }).catch((err) => {
            console.error('❌ 視頻播放失敗:', err)
            setScanStatus('視頻播放失敗')
            setError('視頻播放失敗')
          })
        }
      }
    } catch (err) {
      setError('無法開啟相機，請確認瀏覽器權限')
      setIsScanning(false)
      console.error('❌ 相機開啟失敗:', err)
    }
  }

  // 停止相機
  const handleStopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    if (scanIntervalRef.current) {
      cancelAnimationFrame(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
    setIsScanning(false)
  }

  // 處理手動輸入的資料
  const handleParseData = () => {
    try {
      setError('')
      setScanSuccess(false)
      const parsed = JSON.parse(scannedData)
      
      // 驗證必要欄位（只需要 id 和 deadline）
      if (!parsed.id || !parsed.deadline) {
        throw new Error('缺少必要欄位：id 或 deadline')
      }
      
      setBillId(parsed.id)
      setDeadline(parsed.deadline)
      setScanSuccess(true)
    } catch (err) {
      setError('無法解析 QR Code 資料，請確認格式正確（需包含 id 和 deadline）')
      console.error(err)
    }
  }

  // 格式化時間
  const formatDeadline = (timestamp: number) => {
    const deadline = new Date(timestamp * 1000)
    return deadline.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // 前往付款
  const handleProceedToPayment = async () => {
    if (!billId) return
    
    try {
      // 從 API 載入完整帳單資料
      const bill = await getBillById(billId)
      if (!bill) {
        setError('找不到此銷帳編號對應的帳單')
        return
      }
      
      // 跳轉到付款頁面
      router.push(`/i/${billId}`)
    } catch (err) {
      setError('載入帳單失敗，請稍後再試')
      console.error(err)
    }
  }

  return (
    <MerchantLayout>
      <div style={{ maxWidth: '800px', margin: '0 auto', paddingTop: '20px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '8px' }}>
            掃描 QR Code
          </h1>
          <p className="muted">使用手機掃描收款戶提供的 QR Code，獲取銷帳編號和到期時間</p>
        </div>

        {/* 掃描方式選擇 */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>
            選擇掃描方式
          </h3>
          
          <button
            className="btn btn-primary"
            onClick={isScanning ? handleStopCamera : handleStartCamera}
            style={{ width: '100%', marginBottom: '16px' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '20px', height: '20px', marginRight: '8px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {isScanning ? '停止相機' : '開啟相機掃描'}
          </button>

          {/* 相機預覽 */}
          {isScanning && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ position: 'relative', background: '#000', borderRadius: '8px', overflow: 'hidden', marginBottom: '12px' }}>
                <video
                  ref={videoRef}
                  style={{ width: '100%', maxHeight: '400px', display: 'block' }}
                  playsInline
                />
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                <div style={{ 
                  position: 'absolute', 
                  top: '50%', 
                  left: '50%', 
                  transform: 'translate(-50%, -50%)',
                  border: '2px solid var(--primary)',
                  width: '200px',
                  height: '200px',
                  borderRadius: '8px',
                  pointerEvents: 'none'
                }} />
              </div>
              <div style={{ 
                padding: '12px',
                background: 'var(--info-dim)',
                border: '1px solid var(--info)',
                borderRadius: '8px',
                fontSize: '13px',
                color: 'var(--info)',
                textAlign: 'center',
                animation: 'pulse 2s ease-in-out infinite'
              }}>
                <strong>📷 {scanStatus}</strong><br />
                請將 QR Code 對準相機框內，系統會自動識別
              </div>
              
              {/* 調試信息 */}
              <div style={{ 
                marginTop: '12px',
                padding: '8px',
                background: '#1a1a1a',
                borderRadius: '4px',
                fontSize: '11px',
                fontFamily: 'monospace',
                color: '#888'
              }}>
                調試：{scanStatus}
                <br />
                視頻狀態：{videoRef.current ? `${videoRef.current.readyState}/4` : '無'}
                <br />
                視頻尺寸：{videoRef.current ? `${videoRef.current.videoWidth}x${videoRef.current.videoHeight}` : '無'}
              </div>
            </div>
          )}

          {/* 掃描成功提示 */}
          {scanSuccess && billId && (
            <div style={{ 
              padding: '20px',
              background: 'var(--success-dim)',
              border: '2px solid var(--success)',
              borderRadius: '8px',
              marginBottom: '16px',
              textAlign: 'center',
              animation: 'fadeIn 0.3s ease-in'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
              <div style={{ fontWeight: '700', color: 'var(--success)', fontSize: '20px', marginBottom: '8px' }}>
                掃描成功！
              </div>
              <div className="sub" style={{ marginTop: '4px', fontSize: '14px' }}>
                已識別銷帳編號：{billId}
              </div>
              <div style={{ 
                marginTop: '12px',
                padding: '8px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '4px',
                fontSize: '13px'
              }}>
                正在跳轉到付款頁面...
              </div>
            </div>
          )}

          <div className="divider" style={{ margin: '20px 0' }}></div>

          <div style={{ marginBottom: '16px' }}>
            <label className="sub" style={{ display: 'block', marginBottom: '8px' }}>
              或手動貼上 QR Code 內容（JSON 格式）
            </label>
            <textarea
              value={scannedData}
              onChange={(e) => setScannedData(e.target.value)}
              placeholder='{"id":"bill-2025-0001","deadline":1234567890}'
              style={{ 
                width: '100%', 
                minHeight: '100px',
                fontFamily: 'monospace',
                fontSize: '13px'
              }}
            />
          </div>

          {error && (
            <div style={{ 
              padding: '12px',
              background: 'var(--error-dim)',
              border: '1px solid var(--error)',
              borderRadius: '8px',
              marginBottom: '16px',
              color: 'var(--error)'
            }}>
              {error}
            </div>
          )}

          <button
            className="btn btn-primary"
            onClick={handleParseData}
            disabled={!scannedData.trim()}
            style={{ width: '100%' }}
          >
            解析資料
          </button>
        </div>

        {/* 解析後的帳單資訊（僅用於手動輸入的情況） */}
        {billId && !scanSuccess && (
          <div className="card" style={{ marginBottom: '20px', border: '2px solid var(--success)' }}>
            <div style={{ marginBottom: '16px' }}>
              <div className="row" style={{ alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '24px', height: '24px', color: 'var(--success)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>
                  資料解析成功
                </h3>
              </div>
            </div>

            <div className="divider"></div>

            {/* 帳單資訊 */}
            <div style={{ display: 'grid', gap: '16px', marginBottom: '20px' }}>
              <div>
                <span className="sub">銷帳編號</span>
                <div style={{ fontWeight: '700', marginTop: '4px', fontFamily: 'monospace', fontSize: '18px' }}>
                  {billId}
                </div>
              </div>

              <div>
                <span className="sub">截止時間</span>
                <div style={{ fontWeight: '700', marginTop: '4px', color: 'var(--warning)' }}>
                  {formatDeadline(deadline)}
                </div>
              </div>
            </div>

            <div className="divider"></div>

            <button
              className="btn btn-primary"
              onClick={handleProceedToPayment}
              style={{ width: '100%', fontSize: '16px', padding: '14px' }}
            >
              前往付款
            </button>
          </div>
        )}

        {/* 說明 */}
        {/* <div className="card" style={{ background: 'var(--panel)' }}>
          <div className="row" style={{ gap: '12px', alignItems: 'flex-start' }}>
            <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '20px', height: '20px', flexShrink: 0, color: 'var(--info)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <div style={{ fontWeight: '600', marginBottom: '4px', color: 'var(--info)' }}>
                如何使用
              </div>
              <div className="sub" style={{ fontSize: '12px', lineHeight: '1.6' }}>
                <strong>使用說明：</strong><br />
                <br />
                <strong>方式一：自動掃描（推薦）</strong><br />
                1. 點擊「開啟相機掃描」按鈕並授權相機權限<br />
                2. 將 QR Code 對準相機框內<br />
                3. 系統會自動識別並填入資料<br />
                <br />
                <strong>方式二：手動輸入</strong><br />
                1. 使用其他 QR Code 掃描器讀取 QR Code<br />
                2. 將 JSON 資料貼上到文字框中<br />
                3. 點擊「解析資料」按鈕<br />
                <br />
                確認銷帳編號和截止時間後，點擊「前往付款」完成支付
              </div>
            </div>
          </div>
        </div> */}
      </div>
    </MerchantLayout>
  )
}

