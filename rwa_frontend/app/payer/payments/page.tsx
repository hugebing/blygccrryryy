/**
 * 付款人的付款帳單頁面 - /payer/payments
 * 顯示用戶的付款歷史記錄
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import MerchantLayout from '../../components/layouts/MerchantLayout'
import LoadingState from '../../components/shared/LoadingState'
import EmptyState from '../../components/shared/EmptyState'
import ChainBadge from '../../components/shared/ChainBadge'
import { shortenAddress } from '../../lib/utils'

// 付款記錄類型
interface PaymentRecord {
  billId: string
  payeeAddress: string
  description: string
  timestamp: number
  totalAssets: number
  status: 'completed' | 'pending' | 'failed'
  allocations: Array<{
    assetSymbol: string
    assetType: string
    totalAmount: string
    chains: Array<{
      chainId: number
      amount: string
      txHash?: string // 交易hash
      status?: 'pending' | 'confirmed' | 'failed' // 交易狀態
    }>
  }>
}

export default function PayerPaymentsPage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  
  useEffect(() => {
    loadPayments()
  }, [address])
  
  const loadPayments = async () => {
    setIsLoading(true)
    
    try {
      if (!address) {
        setPayments([])
        setIsLoading(false)
        return
      }
      
      // 從後端 API 獲取付款記錄
      const response = await fetch(`/api/payments/payer/${address}`)
      const result = await response.json()
      
      if (!result.success) {
        console.error('獲取付款記錄失敗:', result.error)
        setPayments([])
        setIsLoading(false)
        return
      }
      
      // 轉換為顯示格式
      const fetchedPayments: PaymentRecord[] = result.data.map((payment: any) => ({
        billId: payment.billId,
        payeeAddress: payment.payeeAddress,
        description: payment.description,
        timestamp: payment.timestamp,
        totalAssets: payment.allocations.length,
        status: payment.status,
        allocations: payment.allocations
      }))
      
      setPayments(fetchedPayments.sort((a, b) => b.timestamp - a.timestamp))
      
      // 作為後備，也從 sessionStorage 獲取記錄（用於向後兼容）
      const mockPayments: PaymentRecord[] = []
      
      // 檢查是否有已保存的付款記錄
      // 這裡我們檢查 demo bill 的付款記錄
      const demoIds = ['bill-2025-0001', 'bill-2025-0006']
      
      demoIds.forEach(billId => {
        const storedBill = sessionStorage.getItem(`payment_bill_${billId}`)
        const storedAllocations = sessionStorage.getItem(`payment_allocations_${billId}`)
        
        if (storedBill && storedAllocations) {
          const bill = JSON.parse(storedBill)
          const allocations = JSON.parse(storedAllocations)
          
          mockPayments.push({
            billId: bill.id,
            payeeAddress: bill.payeeAddress,
            description: bill.description,
            timestamp: Date.now() - Math.random() * 86400000, // 隨機時間
            totalAssets: allocations.length,
            status: 'completed',
            allocations: allocations.map((alloc: any) => ({
              assetSymbol: alloc.assetSymbol,
              assetType: 'ERC20', // 簡化處理
              totalAmount: alloc.totalRequired,
              chains: alloc.chains
            }))
          })
        }
      })
      
      // 如果沒有付款記錄，添加一些示範數據
      if (mockPayments.length === 0 && address) {
        mockPayments.push(
          {
            billId: 'bill-2025-0001',
            payeeAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
            description: 'RWA 資產購買 + NFT 憑證',
            timestamp: Date.now() - 3600000,
            totalAssets: 2,
            status: 'completed',
            allocations: [
              {
                assetSymbol: 'USDT',
                assetType: 'ERC20',
                totalAmount: '5000',
                chains: [
                  { 
                    chainId: 84532, 
                    amount: '3500.75',
                    txHash: `0x${Math.random().toString(16).substring(2, 66)}`,
                    status: 'confirmed' as const
                  },
                  { 
                    chainId: 11155420, 
                    amount: '1499.25',
                    txHash: `0x${Math.random().toString(16).substring(2, 66)}`,
                    status: 'confirmed' as const
                  }
                ]
              },
              {
                assetSymbol: 'NFT',
                assetType: 'ERC721',
                totalAmount: '1',
                chains: [
                  { 
                    chainId: 11155111, 
                    amount: '1',
                    txHash: `0x${Math.random().toString(16).substring(2, 66)}`,
                    status: 'confirmed' as const
                  }
                ]
              }
            ]
          },
          {
            billId: 'bill-2025-0006',
            payeeAddress: '0x9876543210987654321098765432109876543210',
            description: 'NFT Collection #721 購買',
            timestamp: Date.now() - 7200000,
            totalAssets: 1,
            status: 'completed',
            allocations: [
              {
                assetSymbol: 'NFT',
                assetType: 'ERC721',
                totalAmount: '1',
                chains: [
                  { 
                    chainId: 84532, 
                    amount: '1',
                    txHash: `0x${Math.random().toString(16).substring(2, 66)}`,
                    status: 'confirmed' as const
                  }
                ]
              }
            ]
          }
        )
      }
      
      // 如果沒有從後端獲取到記錄，嘗試從 sessionStorage 補充
      if (fetchedPayments.length === 0) {
        setPayments(mockPayments.sort((a, b) => b.timestamp - a.timestamp))
      }
      
    } catch (error) {
      console.error('載入付款記錄失敗:', error)
      setPayments([])
    } finally {
      setIsLoading(false)
    }
  }
  
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  
  const filteredPayments = payments.filter(payment => 
    payment.billId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    payment.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    payment.payeeAddress.toLowerCase().includes(searchQuery.toLowerCase())
  )
  
  if (!isConnected) {
    return (
      <MerchantLayout>
        <div style={{ maxWidth: '800px', margin: '80px auto', padding: '0 20px' }}>
          <EmptyState
            icon="search"
            title="請連接錢包"
            description="您需要連接錢包才能查看付款記錄"
          />
        </div>
      </MerchantLayout>
    )
  }
  
  if (isLoading) {
    return (
      <MerchantLayout>
        <div style={{ marginTop: '80px' }}>
          <LoadingState message="載入付款記錄..." />
        </div>
      </MerchantLayout>
    )
  }
  
  return (
    <MerchantLayout>
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '80px 20px 40px' }}>
        {/* 標題 */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '8px' }}>
            付款帳單
          </h1>
          <p className="sub">
            查看您的付款歷史記錄
          </p>
        </div>
        
        {/* 搜尋和統計 */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap'
          }}>
            <div style={{ flex: 1, minWidth: '250px' }}>
              <input
                type="text"
                placeholder="搜尋銷帳編號、說明或收款戶..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: '800', fontFamily: 'monospace' }}>
                  {payments.length}
                </div>
                <div className="sub" style={{ fontSize: '11px' }}>總付款數</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* 付款記錄列表 */}
        {filteredPayments.length === 0 ? (
          <EmptyState
            icon="list"
            title={searchQuery ? '找不到符合的付款記錄' : '尚無付款記錄'}
            description={searchQuery ? '請嘗試其他搜尋條件' : '開始掃描 QR Code 進行付款'}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredPayments.map((payment) => (
              <div 
                key={payment.billId}
                className="card"
                onClick={() => router.push(`/i/${payment.billId}/payment-success`)}
                style={{ 
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: 'var(--card)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.borderColor = 'var(--info)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.borderColor = 'var(--line)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                  {/* 左側：帳單資訊 */}
                  <div style={{ flex: 1, minWidth: '250px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '18px', fontWeight: '700' }}>
                        {payment.description}
                      </span>
                      <span className={`pill ${
                        payment.status === 'completed' ? 'success' : 
                        payment.status === 'pending' ? 'warning' : 'error'
                      }`} style={{ fontSize: '10px' }}>
                        {payment.status === 'completed' ? '✓ 已完成' :
                         payment.status === 'pending' ? '⏳ 處理中' : '✗ 失敗'}
                      </span>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span className="sub" style={{ fontSize: '11px' }}>銷帳編號:</span>
                        <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: '600' }}>
                          {payment.billId}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span className="sub" style={{ fontSize: '11px' }}>收款戶:</span>
                        <span style={{ fontFamily: 'monospace', fontSize: '11px' }}>
                          {shortenAddress(payment.payeeAddress, 6, 4)}
                        </span>
                      </div>
                      
                      <div className="sub" style={{ fontSize: '11px' }}>
                        {formatDate(payment.timestamp)}
                      </div>
                    </div>
                  </div>
                  
                  {/* 右側：付款摘要 */}
                  <div style={{ minWidth: '200px' }}>
                    <div className="sub" style={{ fontSize: '11px', marginBottom: '8px' }}>
                      付款資產 ({payment.totalAssets} 種)
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {payment.allocations.map((alloc, index) => (
                        <div 
                          key={index}
                          style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '6px 10px',
                            background: 'var(--panel)',
                            borderRadius: '6px'
                          }}
                        >
                          <span style={{ fontSize: '12px', fontWeight: '600' }}>
                            {alloc.assetSymbol}
                          </span>
                          <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: '700' }}>
                            {alloc.assetType === 'ERC20' 
                              ? `${parseFloat(alloc.totalAmount).toFixed(2)}`
                              : `×${alloc.totalAmount}`
                            }
                          </span>
                        </div>
                      ))}
                    </div>
                    
                    {/* 使用的鏈 */}
                    <div style={{ marginTop: '8px' }}>
                      <div className="sub" style={{ fontSize: '10px', marginBottom: '4px' }}>
                        使用鏈數: {payment.allocations.reduce((sum, alloc) => sum + alloc.chains.length, 0)}
                      </div>
                      <div className="row" style={{ gap: '4px', flexWrap: 'wrap' }}>
                        {Array.from(new Set(
                          payment.allocations.flatMap(alloc => alloc.chains.map(c => c.chainId))
                        )).map(chainId => (
                          <ChainBadge key={chainId} chainId={chainId as any} size="sm" />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MerchantLayout>
  )
}

