/**
 * Mock 資料服務 - 模擬 API 回應
 * 用於開發階段測試，之後可替換為真實 API
 * 
 * 注意：所有默認數據現在統一從 data/default-data.json 讀取
 * 修改該文件即可更新所有默認數據
 */

import type { Bill, BillEvent, VaultInfo, PaymentProgress, MCPI, Payment } from '../types'

// ============ API 通信管理 ============
// 從服務器 API 獲取帳單數據

// API 基礎 URL
const API_BASE = '/api/bills'

// API for other data
const DATA_API_BASE = '/api/data'

// 從服務器載入帳單
async function loadBillsFromServer(): Promise<Bill[]> {
  try {
    const response = await fetch(API_BASE)
    const result = await response.json()
    
    if (result.success) {
      return result.data
    }
    
    console.error('載入帳單失敗:', result.error)
    return []
  } catch (error) {
    console.error('載入帳單失敗:', error)
    return []
  }
}

// 清空帳單（重置為默認）
export async function resetBills() {
  try {
    const response = await fetch(`${API_BASE}/reset`, {
      method: 'POST',
    })
    const result = await response.json()
    
    if (result.success) {
      // 重新載入頁面以應用變更
      window.location.reload()
    } else {
      console.error('重置帳單失敗:', result.error)
      alert('重置帳單失敗')
    }
  } catch (error) {
    console.error('重置帳單失敗:', error)
    alert('重置帳單失敗')
  }
}

// ============ Mock 數據（僅用於類型兼容）============
// 注意：所有默認數據現在統一從 data/default-data.json 讀取
// 修改該文件即可更新所有默認數據
export const mockBills: Bill[] = []
export const mockEvents: Record<string, BillEvent[]> = {}
export const mockVaults: VaultInfo[] = []
export const mockPayments: Payment[] = []
export const mockPaymentProgress: Record<string, PaymentProgress> = {}

// ============ API 模擬函數 ============

// 延遲函數（模擬網路延遲）
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// 獲取帳單
export async function getBill(billId: string): Promise<Bill | null> {
  try {
    const response = await fetch(`${API_BASE}/${billId}`)
    const result = await response.json()
    
    if (result.success) {
      return result.data
    }
    
    return null
  } catch (error) {
    console.error('獲取帳單失敗:', error)
    return null
  }
}

// 別名：getBillById
export const getBillById = getBill

// 獲取所有帳單
export async function getBills(): Promise<Bill[]> {
  return await loadBillsFromServer()
}

// 獲取帳單的付款記錄
export async function getPaymentsByBillId(billId: string): Promise<Payment[]> {
  await delay(400)
  return mockPayments.filter(p => p.billId === billId)
}

// 獲取帳單事件
export async function getBillEvents(billId: string): Promise<BillEvent[]> {
  try {
    const response = await fetch(`${DATA_API_BASE}/events/${billId}`)
    const result = await response.json()
    if (result.success) {
      return result.data
    }
    return []
  } catch (error) {
    console.error('獲取事件失敗:', error)
    return []
  }
}

// 獲取付款進度（目前仍為靜態數據）
export async function getPaymentProgress(billId: string): Promise<PaymentProgress | null> {
  await delay(300)
  return null // TODO: 從 API 獲取
}

// 獲取所有 Vaults
export async function getVaults(): Promise<VaultInfo[]> {
  try {
    const response = await fetch(`${DATA_API_BASE}/vaults`)
    const result = await response.json()
    if (result.success) {
      return result.data
    }
    return []
  } catch (error) {
    console.error('獲取 Vaults 失敗:', error)
    return []
  }
}

// 獲取單個 Vault
export async function getVault(chainId: number): Promise<VaultInfo | null> {
  const vaults = await getVaults()
  return vaults.find(v => v.chainId === chainId) || null
}

// 建立帳單
export async function createBill(data: Partial<Bill>): Promise<Bill> {
  try {
    const response = await fetch(`${API_BASE}/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    
    const result = await response.json()
    
    if (result.success) {
      return result.data
    }
    
    throw new Error(result.error || '建立帳單失敗')
  } catch (error) {
    console.error('建立帳單失敗:', error)
    throw error
  }
}

// 簽署 MCPI
export async function signMCPI(mcpi: MCPI): Promise<{ success: boolean; signature?: `0x${string}` }> {
  await delay(800)
  return {
    success: true,
    signature: '0x' + '0'.repeat(130) as `0x${string}`,
  }
}

// 模擬領款
export async function executeClaim(
  vaultAddress: `0x${string}`,
  chainId: number,
  amount: string
): Promise<{ success: boolean; txHash?: `0x${string}` }> {
  await delay(1000)
  return {
    success: true,
    txHash: ('0x' + Math.random().toString(16).substring(2, 66)) as `0x${string}`,
  }
}

// 模擬退款
export async function executeRefund(
  vaultAddress: `0x${string}`,
  chainId: number,
  payerAddress: `0x${string}`,
  amount: string
): Promise<{ success: boolean; txHash?: `0x${string}` }> {
  await delay(1000)
  return {
    success: true,
    txHash: ('0x' + Math.random().toString(16).substring(2, 66)) as `0x${string}`,
  }
}

