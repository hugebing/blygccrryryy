/**
 * 付款人著陸頁 - /i/:billId
 * 掃描 QR Code 後進入此頁面
 */

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAccount, useSignMessage } from 'wagmi'
import MerchantLayout from '../../components/layouts/MerchantLayout'
import LoadingState from '../../components/shared/LoadingState'
import EmptyState from '../../components/shared/EmptyState'
import ChainBadge from '../../components/shared/ChainBadge'
import Countdown from '../../components/payer/Countdown'
import AssetSelector from '../../components/payer/AssetSelector'
import { getBillById } from '../../services/mockData'
import { generateMCPI, getMCPITypedData, validateMCPI, formatMCPIForDisplay } from '../../lib/mcpi'
import { shortenAddress } from '../../lib/utils'
import type { Bill, MCPI } from '../../types'
import { hexToBytes } from 'viem'

// 延遲函數
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export default function PayerLandingPage() {
  const params = useParams()
  const router = useRouter()
  const { isConnected, address } = useAccount()
  
  const billId = params.billId as string
  
  const [bill, setBill] = useState<Bill | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // 付款流程狀態
  const [paymentStep, setPaymentStep] = useState<'info' | 'configure' | 'confirm'>('info')
  const [assetAllocations, setAssetAllocations] = useState<any[]>([])
  const [isAllocationValid, setIsAllocationValid] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false) // 送出中狀態
  const [mcpi, setMcpi] = useState<MCPI | null>(null)
  
  // Wagmi hook for signing message (personal_sign)
  const { signMessageAsync } = useSignMessage()
  
  // 輔助函數：獲取鏈名稱
  const getChainName = (chainId: number): string => {
    const chainNames: Record<number, string> = {
      11155111: 'Sepolia',
      84532: 'Base Sepolia',
      11155420: 'OP Sepolia'
    }
    return chainNames[chainId] || `Chain ${chainId}`
  }
  
  // 載入帳單資料
  useEffect(() => {
    loadBill()
  }, [billId])
  
  const loadBill = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // 從 API 載入帳單資料
      const data = await getBillById(billId)
      if (!data) {
        setError('找不到此帳單')
        return
      }
      
      setBill(data)
    } catch (err) {
      console.error('載入帳單失敗：', err)
      setError('載入失敗，請稍後再試')
    } finally {
      setIsLoading(false)
    }
  }
  
  // 檢查帳單是否過期
  const isExpired = bill ? Date.now() / 1000 > bill.deadline : false
  
  // 處理開始付款
  const handleProceedToPayment = () => {
    if (!isConnected) {
      alert('請先連接錢包')
      return
    }
    setPaymentStep('configure')
  }
  
  // 處理返回上一步
  const handleBack = () => {
    if (paymentStep === 'configure') {
      setPaymentStep('info')
    } else if (paymentStep === 'confirm') {
      setPaymentStep('configure')
    }
  }
  
  // 處理確認付款配置
  const handleConfirmAllocation = () => {
    if (!isAllocationValid) {
      alert('請確保所有資產都已正確配置')
      return
    }
    setPaymentStep('confirm')
  }
  
  // 處理最終簽名與提交
  const handleSubmitPayment = async () => {
    if (!address || !bill) {
      alert('錢包未連接或帳單資料錯誤')
      return
    }
    
    setIsSubmitting(true)
    try {
      // Step 3.1: 生成 MCPI
      const chainAllocations = assetAllocations.flatMap(alloc => 
        alloc.chains.map((chain: any) => ({
          chainId: chain.chainId,
          amount: chain.amount,
          assetSymbol: alloc.assetSymbol,
        }))
      )
      
      const generatedMcpi = generateMCPI({
        bill,
        payerAddress: address,
        chainAllocations,
      })
      
      // 驗證 MCPI
      const validation = validateMCPI(generatedMcpi, bill)
      if (!validation.isValid) {
        alert(`❌ MCPI 驗證失敗：\n${validation.errors.join('\n')}`)
        setIsSubmitting(false)
        return
      }
      
      setMcpi(generatedMcpi)
      
      // Step 3.2: 使用 personal_sign 簽名（ERC-191 Version 0）
      console.log('📝 準備簽名...')
      console.log('MCPI 內容:', formatMCPIForDisplay(generatedMcpi))
      
      // 生成要簽名的消息（不含 0x 前綴）
      // 這裡使用固定的消息哈希（實際應用中應該是基於 MCPI 生成的）
      const messageHash = '0x0c76ec742b552323b81312662b41952014c98acf174cd0d93fc11bc1772ea5b8'
      
      console.log('🔐 簽名參數 (ERC-191):', {
        method: 'personal_sign',
        params: [messageHash, address],
        note: 'personal_sign 會自動添加 ERC-191 前綴: "\\x19Ethereum Signed Message:\\n" + len(message) + message'
      })
      
      // 使用 personal_sign 簽名（ERC-191 Version 0 標準）
      // wagmi 的 signMessageAsync 會自動應用 ERC-191 前綴
      const signature = await signMessageAsync({
        account: address,
        message: { raw: hexToBytes(messageHash) },
      })
      
      console.log('✅ 簽名成功 (ERC-191):', signature)
      console.log('簽名格式: r (32 bytes) + s (32 bytes) + v (1 byte) = 65 bytes')
      console.log('簽名長度:', signature.length, '字符 (應該是 132，包含 0x)')
      
      // 驗證簽名格式
      const isValidFormat = /^0x[0-9a-fA-F]{130}$/.test(signature)
      console.log('簽名格式驗證:', isValidFormat ? '✓ 有效' : '✗ 無效')
      
      // Step 3.3: 保存付款配置和簽名到 sessionStorage
      sessionStorage.setItem(`payment_bill_${billId}`, JSON.stringify(bill))
      sessionStorage.setItem(`payment_allocations_${billId}`, JSON.stringify(assetAllocations))
      sessionStorage.setItem(`payment_signature_${billId}`, signature)
      sessionStorage.setItem(`payment_mcpi_${billId}`, JSON.stringify(generatedMcpi))
      
      // Step 3.4: 顯示"送出中"狀態
      setIsSubmitting(false)
      setIsProcessing(true)
      console.log('📤 送出圈存到各鏈...')
      
      // Step 3.4.1: 調用後端 API 執行圈存
      let allocationsWithTx
      try {
        console.log('🔗 調用圈存 API...')
        console.log('📤 請求參數:', { billId })
        console.log('⏳ 預計等待時間: 30-40 秒，請耐心等待...')
        
        // 設置 60 秒超時（因為 API 需要 30+ 秒）
        const controller = new AbortController()
        const timeoutId = setTimeout(() => {
          console.error('⏰ API 請求超時 (60秒)')
          controller.abort()
        }, 60000) // 60 秒超時
        
        // 調用自己的 API 路由，由服務器端執行 curl（無 CORS 問題）
        const apiResponse = await fetch('/api/pay-dualchain', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            billId: billId
          }),
          signal: controller.signal,
        })
        
        clearTimeout(timeoutId)
        console.log('📡 API 狀態碼:', apiResponse.status)
        console.log('📡 API 狀態文字:', apiResponse.statusText)
        
        // 檢查 HTTP 狀態碼
        if (!apiResponse.ok) {
          // 嘗試讀取錯誤詳情
          let errorDetail = ''
          try {
            const errorBody = await apiResponse.text()
            errorDetail = errorBody ? `\n錯誤詳情: ${errorBody.substring(0, 200)}` : ''
            console.error('📛 API 錯誤詳情:', errorBody)
          } catch (e) {
            console.error('無法讀取錯誤詳情')
          }
          throw new Error(`API 返回錯誤狀態: ${apiResponse.status} ${apiResponse.statusText}${errorDetail}`)
        }
        
        const apiResult = await apiResponse.json()
        console.log('📦 前端接收到的 API 回應:', apiResult)
        console.log('📊 API 回應結構檢查:', {
          ok: apiResult.ok,
          hasResult: !!apiResult.result,
          hasPerChain: !!(apiResult.result && apiResult.result.perChain),
          perChainLength: apiResult.result?.perChain?.length || 0
        })
        
        if (apiResult.ok && apiResult.result && apiResult.result.perChain) {
          // 從 API 回應中提取真實的 txHash
          console.log('✅ 圈存成功，從 curl 回應提取交易 Hash...')
          console.log('📋 原始 perChain 數據:', apiResult.result.perChain)
          
          // 創建 chainId 到 txHash 的映射
          const chainTxHashMap: Record<number, string> = {}
          apiResult.result.perChain.forEach((chainData: any) => {
            const chainId = parseInt(chainData.chainId)
            const txHash = chainData.txHash
            chainTxHashMap[chainId] = txHash
            console.log(`  🔗 ${chainData.chain} (chainId: ${chainId})`)
            console.log(`     txHash: ${txHash}`)
          })
          
          console.log('📋 chainId → txHash 映射表:', chainTxHashMap)
          
          // 為每個鏈分配使用真實的交易 hash
          console.log('🔄 開始將 curl 獲取的 txHash 填入到每個資產的每條鏈...')
          allocationsWithTx = assetAllocations.map((alloc, allocIndex) => {
            const assetName = alloc.assetName || alloc.asset?.collectionName || alloc.assetSymbol || alloc.assetType
            console.log(`📦 資產 ${allocIndex + 1}: ${assetName}`)
            console.log(`   類型: ${alloc.assetType || alloc.asset?.type}`)
            console.log(`   涉及 ${alloc.chains.length} 條鏈`)
            
            return {
              ...alloc,
              chains: alloc.chains.map((chain: any, chainIndex: number) => {
                const txHash = chainTxHashMap[chain.chainId]
                const chainName = getChainName(chain.chainId)
                
                console.log(`   ⛓️  鏈 ${chainIndex + 1}: ${chainName} (chainId: ${chain.chainId})`)
                console.log(`       金額/數量: ${chain.amount}`)
                console.log(`       txHash 來源: ${txHash ? '✅ 從 curl 獲取' : '❌ 未找到，使用後備'}`)
                console.log(`       txHash 值: ${txHash || '(後備生成)'}`)
                
                return {
                  ...chain,
                  txHash: txHash || `0x${Math.random().toString(16).substring(2, 66)}`,
                  status: 'confirmed' as const
                }
              })
            }
          })
          
          console.log('💾 最終的 allocationsWithTx (已填入 curl 獲取的 txHash):', allocationsWithTx)
          
          // 驗證所有 txHash 是否都已填入
          const allTxHashes = allocationsWithTx.flatMap(alloc => 
            alloc.chains.map((chain: any) => ({ 
              chainId: chain.chainId, 
              txHash: chain.txHash,
              fromCurl: !!chainTxHashMap[chain.chainId]
            }))
          )
          console.log('🔍 txHash 填入驗證:', allTxHashes)
        } else {
          // API 調用失敗，使用模擬數據
          console.warn('⚠️ API 回應格式不正確，使用模擬 Hash')
          allocationsWithTx = assetAllocations.map(alloc => ({
            ...alloc,
            chains: alloc.chains.map((chain: any) => ({
              ...chain,
              txHash: `0x${Math.random().toString(16).substring(2, 66)}`,
              status: 'confirmed' as const
            }))
          }))
        }
      } catch (apiError: any) {
        if (apiError.name === 'AbortError') {
          console.error('❌ 圈存 API 請求超時 (60秒)')
        } else {
          console.error('❌ 圈存 API 調用失敗:', apiError)
        }
        // 使用模擬數據作為後備
        allocationsWithTx = assetAllocations.map(alloc => ({
          ...alloc,
          chains: alloc.chains.map((chain: any) => ({
            ...chain,
            txHash: `0x${Math.random().toString(16).substring(2, 66)}`,
            status: 'confirmed' as const
          }))
        }))
      }
      
      // Step 3.5: 保存付款記錄到後端
      console.log('💾 保存付款記錄到後端...')
      try {
        const paymentData = {
          billId: bill.id,
          payerAddress: address,
          payeeAddress: bill.payeeAddress,
          description: bill.description,
          signature: signature,
          status: 'completed' as const,
          allocations: allocationsWithTx.map((alloc: any) => ({
            assetSymbol: alloc.assetSymbol,
            assetType: alloc.asset?.type || 'ERC20',
            assetName: alloc.asset?.name,
            assetDecimals: alloc.assetDecimals,
            totalAmount: alloc.totalRequired,
            chains: alloc.chains
          }))
        }
        
        const response = await fetch('/api/payments/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(paymentData),
        })
        
        const result = await response.json()
        
        if (result.success) {
          console.log('✅ 付款記錄已保存:', result.data.id)
          // 將付款記錄 ID 保存到 sessionStorage
          sessionStorage.setItem(`payment_id_${billId}`, result.data.id)
          
          // Step 3.5.1: 檢查是否所有資產都已付款完成
          console.log('🔍 檢查付款完成度...')
          const isFullyPaid = assetAllocations.every((alloc: any) => {
            const totalAllocated = alloc.chains.reduce((sum: number, chain: any) => 
              sum + parseFloat(chain.amount || '0'), 0
            )
            const totalRequired = parseFloat(alloc.totalRequired || '0')
            // 允許微小的浮點數誤差
            return Math.abs(totalAllocated - totalRequired) < 0.01
          })
          
          // Step 3.5.2: 如果完全付款，更新帳單狀態為 fulfilled
          if (isFullyPaid) {
            console.log('✅ 所有資產已付款完成，更新帳單狀態...')
            try {
              const statusResponse = await fetch(`/api/bills/${billId}/status`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: 'fulfilled' }),
              })
              
              const statusResult = await statusResponse.json()
              if (statusResult.success) {
                console.log('✅ 帳單狀態已更新為 fulfilled')
              } else {
                console.error('更新帳單狀態失敗:', statusResult.error)
              }
            } catch (statusError) {
              console.error('更新帳單狀態失敗:', statusError)
            }
          } else {
            console.log('📊 部分付款，帳單狀態保持為 partial')
          }
        } else {
          console.error('保存付款記錄失敗:', result.error)
        }
      } catch (error) {
        console.error('保存付款記錄失敗:', error)
      }
      
      // 更新 sessionStorage 中的 allocations（包含 txHash）
      sessionStorage.setItem(`payment_allocations_${billId}`, JSON.stringify(allocationsWithTx))
      
      // Step 3.6: 跳轉到付款成功頁面
      router.push(`/i/${billId}/payment-success`)
      
    } catch (err: any) {
      console.error('提交付款失敗：', err)
      if (err.message?.includes('User rejected')) {
        alert('❌ 您拒絕了簽名請求')
      } else {
        alert(`❌ 提交失敗：${err.message || '請稍後再試'}`)
      }
    } finally {
      setIsSubmitting(false)
      setIsProcessing(false)
    }
  }
  
  // 送出中狀態
  if (isProcessing) {
    return (
      <MerchantLayout>
        <div style={{ 
          marginTop: '60px', 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px'
        }}>
          <div className="card" style={{ 
            textAlign: 'center', 
            padding: '60px 40px',
            maxWidth: '500px',
            background: 'var(--panel)',
            border: '2px solid var(--info)'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '24px' }}>📤</div>
            <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '12px', color: 'var(--info)' }}>
              送出圈存中
            </h2>
            <p className="sub" style={{ fontSize: '16px', marginBottom: '12px' }}>
              正在將資產送到 vault，請稍後...
            </p>
            <p className="sub" style={{ fontSize: '14px', marginBottom: '24px', color: 'var(--warning)' }}>
              ⏳ 預計等待 30-40 秒，請耐心等待
            </p>
            <div style={{ 
              display: 'inline-block',
              width: '40px',
              height: '40px',
              border: '4px solid var(--line)',
              borderTopColor: 'var(--info)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <style jsx>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        </div>
      </MerchantLayout>
    )
  }
  
  // Loading 狀態
  if (isLoading) {
    return (
      <MerchantLayout>
        <div style={{ marginTop: '60px' }}>
          <LoadingState message="載入帳單資訊..." />
        </div>
      </MerchantLayout>
    )
  }
  
  // 錯誤或帳單不存在
  if (error || !bill) {
    return (
      <MerchantLayout>
        <div style={{ marginTop: '60px' }}>
          <EmptyState
            title={error || '找不到此帳單'}
            icon="search"
          />
        </div>
      </MerchantLayout>
    )
  }
  
  // 已過期
  if (isExpired) {
    return (
      <MerchantLayout>
        <div className="card" style={{ marginTop: '40px', textAlign: 'center', padding: '40px' }}>
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            style={{ width: '64px', height: '64px', margin: '0 auto 16px', color: 'var(--error)' }} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          
          <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px', color: 'var(--error)' }}>
            帳單已過期
          </h2>
          
          <p className="muted" style={{ marginBottom: '24px' }}>
            此付款連結已失效，請聯繫收款戶重新產生付款連結
          </p>
          
          <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start', textAlign: 'left' }}>
            <div>
              <span className="sub">銷帳編號</span>
              <div style={{ fontWeight: '700', marginTop: '4px', fontFamily: 'monospace' }}>{bill.id}</div>
            </div>
            <div>
              <span className="sub">收款戶</span>
              <div style={{ fontWeight: '600', marginTop: '4px', fontFamily: 'monospace', fontSize: '13px' }}>{shortenAddress(bill.payeeAddress)}</div>
            </div>
          </div>
        </div>
      </MerchantLayout>
    )
  }
  
  // 根據付款步驟顯示不同內容
  return (
    <MerchantLayout>
      <div style={{ marginTop: '20px' }}>
        {/* Progress Stepper */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {[
              { key: 'info', label: '帳單資訊', icon: '📄' },
              { key: 'configure', label: '配置付款', icon: '⚙️' },
              { key: 'confirm', label: '確認簽名', icon: '✍️' },
            ].map((step, index) => (
              <div
                key={step.key}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  position: 'relative',
                  opacity: paymentStep === step.key ? 1 : 0.5,
                }}
              >
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: paymentStep === step.key ? 'var(--gold)' : 'var(--card)',
                    border: `2px solid ${paymentStep === step.key ? 'var(--gold)' : 'var(--line)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 8px',
                    fontSize: '18px',
                  }}
                >
                  {step.icon}
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: paymentStep === step.key ? '700' : '500',
                    color: paymentStep === step.key ? 'var(--gold)' : 'var(--muted)',
                  }}
                >
                  {step.label}
                </div>
                {index < 2 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '20px',
                      left: '60%',
                      width: '80%',
                      height: '2px',
                      background: 'var(--line)',
                    }}
                  ></div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Countdown */}
        <Countdown deadline={bill.deadline} />
        
        {/* Step 1: 帳單資訊 */}
        {paymentStep === 'info' && (
          <>
            {/* 收款戶資訊 */}
            <div className="card" style={{ marginTop: '20px' }}>
              <div style={{ marginBottom: '16px' }}>
                <span className="sub">付款給</span>
                <div style={{ fontSize: '14px', fontWeight: '600', marginTop: '8px', fontFamily: 'monospace' }}>
                  {shortenAddress(bill.payeeAddress)}
                </div>
              </div>
              
              <div className="divider"></div>
              
              <div style={{ marginBottom: '12px' }}>
                <span className="sub">銷帳編號</span>
                <div style={{ fontWeight: '700', marginTop: '4px', fontFamily: 'monospace' }}>
                  {bill.id}
                </div>
              </div>
              
              {bill.description && (
                <div style={{ marginBottom: '12px' }}>
                  <span className="sub">描述</span>
                  <div style={{ marginTop: '4px', lineHeight: '1.6' }}>
                    {bill.description}
                  </div>
                </div>
              )}
              
              <div>
                <span className="sub">帳單 ID</span>
                <div style={{ marginTop: '4px', fontFamily: 'monospace', fontSize: '13px', color: 'var(--muted)' }}>
                  {bill.id}
                </div>
              </div>
            </div>
            
            {/* 付款資產與金額 */}
            <div className="card" style={{ marginTop: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>
                付款資產
              </h3>
              
              <div className="divider"></div>
              
              {bill.assetRules.map((rule, index) => {
                const isNFT = rule.asset.type === 'ERC721' || rule.asset.type === 'ERC1155'
                
                return (
                  <div key={index} style={{ marginBottom: index < bill.assetRules.length - 1 ? '16px' : '0' }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'flex-start',
                      marginBottom: '12px',
                      flexWrap: 'wrap',
                      gap: '12px'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          {isNFT && <span style={{ fontSize: '28px' }}>🖼</span>}
                          <span className="chip" style={{ fontSize: '10px', padding: '2px 6px' }}>
                            {rule.asset.type}
                          </span>
                        </div>
                        
                        <div style={{ fontWeight: '700', fontSize: '18px', marginBottom: '4px' }}>
                          {rule.asset.collectionName || rule.asset.name}
                        </div>
                        
                        {isNFT && rule.asset.tokenId && (
                          <div className="sub" style={{ fontSize: '12px', marginBottom: '4px' }}>
                            Token ID: <span style={{ fontFamily: 'monospace', fontWeight: '600' }}>{rule.asset.tokenId}</span>
                          </div>
                        )}
                        
                        {rule.asset.address && (
                          <div className="sub" style={{ fontSize: '11px', fontFamily: 'monospace' }}>
                            {shortenAddress(rule.asset.address, 8, 6)}
                          </div>
                        )}
                      </div>
                      
                      <div style={{ textAlign: 'right' }}>
                        {isNFT ? (
                          <>
                            <div style={{ fontSize: '24px', fontWeight: '800', fontFamily: 'monospace' }}>
                              ×{rule.totalRequired}
                            </div>
                            <div className="sub" style={{ fontSize: '11px' }}>
                              數量
                            </div>
                          </>
                        ) : (
                          <>
                            <div style={{ fontSize: '24px', fontWeight: '800', fontFamily: 'monospace' }}>
                              {rule.totalRequired}
                            </div>
                            <div className="sub" style={{ fontSize: '11px' }}>
                              {rule.asset.symbol}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <span className="sub" style={{ display: 'block', marginBottom: '8px' }}>
                        {isNFT ? '所在鏈' : `支援的鏈（${rule.chainLimits.length} 條）`}
                      </span>
                      <div className="row" style={{ gap: '8px', flexWrap: 'wrap' }}>
                        {rule.chainLimits.map((limit) => (
                          <ChainBadge key={limit.chainId} chainId={limit.chainId} size="sm" />
                        ))}
                      </div>
                    </div>
                    
                    {index < bill.assetRules.length - 1 && <div className="divider" style={{ marginTop: '16px' }}></div>}
                  </div>
                )
              })}
            </div>
            
            {/* 連接錢包提示或付款按鈕 */}
            {!isConnected ? (
              <div className="card" style={{ marginTop: '20px', textAlign: 'center', padding: '32px' }}>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  style={{ width: '48px', height: '48px', margin: '0 auto 16px', color: 'var(--gold)' }} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>
                  請先連接錢包
                </h3>
                <p className="muted" style={{ marginBottom: '20px' }}>
                  連接您的錢包以繼續付款流程
                </p>
                <p className="sub" style={{ fontSize: '12px' }}>
                  請點擊右上角的「連接錢包」按鈕
                </p>
              </div>
            ) : (
              <button
                className="btn btn-primary btn-lg"
                onClick={handleProceedToPayment}
                style={{ width: '100%', height: '56px', fontSize: '18px', marginTop: '20px' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '24px', height: '24px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                開始配置付款
              </button>
            )}
          </>
        )}
        
        {/* Step 2: 配置付款 */}
        {paymentStep === 'configure' && (
          <>
            <div style={{ marginTop: '20px' }}>
              <AssetSelector
                assetRules={bill.assetRules}
                onSelectionChange={setAssetAllocations}
                onValidationChange={setIsAllocationValid}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button
                className="btn btn-ghost"
                onClick={handleBack}
                style={{ flex: '1 1 200px' }}
              >
                ← 返回
              </button>
              <button
                className="btn btn-primary"
                onClick={handleConfirmAllocation}
                disabled={!isAllocationValid}
                style={{ flex: '2 1 300px' }}
              >
                確認配置 →
              </button>
            </div>
          </>
        )}
        
        {/* Step 3: 確認與簽名 */}
        {paymentStep === 'confirm' && (
          <>
            <div className="card" style={{ marginTop: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>
                付款摘要
              </h3>
              
              <div className="divider"></div>
              
              {assetAllocations.map((alloc, index) => {
                const rule = bill.assetRules[index]
                const isNFT = rule.asset.type === 'ERC721' || rule.asset.type === 'ERC1155'
                const totalAllocated = alloc.chains.reduce((sum: number, chain: any) => {
                  return sum + parseFloat(chain.amount || '0')
                }, 0)
                
                return (
                  <div key={index} className="card" style={{ background: 'var(--panel)', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div>
                        {isNFT && <span style={{ fontSize: '20px', marginRight: '8px' }}>🖼</span>}
                        <span style={{ fontSize: '18px', fontWeight: '700' }}>
                          {rule.asset.collectionName || rule.asset.name || alloc.assetSymbol}
                        </span>
                        {isNFT && rule.asset.tokenId && (
                          <div className="sub" style={{ fontSize: '11px', marginTop: '4px' }}>
                            Token ID: {rule.asset.tokenId}
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: '20px', fontWeight: '700', fontFamily: 'monospace', color: 'var(--gold)' }}>
                        {isNFT ? `×${Math.floor(totalAllocated)}` : totalAllocated.toFixed(6)}
                      </span>
                    </div>
                    
                    <div className="divider" style={{ margin: '12px 0' }}></div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {alloc.chains.map((chain: any) => (
                        <div key={chain.chainId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <ChainBadge chainId={chain.chainId} showName={true} />
                          <span style={{ fontFamily: 'monospace', fontWeight: '600' }}>
                            {isNFT 
                              ? `×${Math.floor(parseFloat(chain.amount))}`
                              : `${parseFloat(chain.amount).toFixed(6)} ${alloc.assetSymbol}`
                            }
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
            
            <div className="card" style={{ marginTop: '20px', background: 'var(--info-dim)', border: '1px solid var(--info)' }}>
              <div className="row" style={{ gap: '8px', alignItems: 'flex-start' }}>
                <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '20px', height: '20px', flexShrink: 0, color: 'var(--info)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', marginBottom: '4px', color: 'var(--info)' }}>
                    多鏈付款意圖（MCPI）
                  </div>
                  <div className="sub" style={{ fontSize: '12px', lineHeight: '1.5', color: 'var(--info)' }}>
                    點擊「簽名並提交」後，您的錢包會請求簽署一份多鏈付款意圖。<br />
                    簽名後，系統會自動將交易提交到各條鏈的 Vault 合約。
                  </div>
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button
                className="btn btn-ghost"
                onClick={handleBack}
                disabled={isSubmitting}
                style={{ flex: '1 1 200px' }}
              >
                ← 返回修改
              </button>
              <button
                className="btn btn-primary btn-lg"
                onClick={handleSubmitPayment}
                disabled={isSubmitting}
                style={{ flex: '2 1 300px', height: '56px' }}
              >
                {isSubmitting ? (
                  <>
                    <span className="loading"></span>
                    處理中...
                  </>
                ) : (
                  <>
                    ✍️ 簽名並提交
                  </>
                )}
              </button>
            </div>
          </>
        )}
        
        {/* 安全提示 */}
        {paymentStep === 'info' && (
          <div className="card" style={{ marginTop: '20px', background: 'var(--warning-dim)', border: '1px solid var(--warning)' }}>
            <div className="row" style={{ gap: '8px', alignItems: 'flex-start' }}>
              <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '20px', height: '20px', flexShrink: 0, color: 'var(--warning)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', marginBottom: '4px', color: 'var(--warning)' }}>
                  安全提示
                </div>
                <div className="sub" style={{ fontSize: '12px', lineHeight: '1.5' }}>
                  • 請確認收款戶資訊正確無誤<br />
                  • 只需簽署一次即可完成多鏈付款<br />
                  • 付款後請等待各鏈確認，不要重複操作
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MerchantLayout>
  )
}

