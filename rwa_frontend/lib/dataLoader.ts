/**
 * 統一數據加載器
 * 所有默認數據都從 data/default-data.json 讀取
 * 這是唯一的數據源，修改此文件即可更新所有默認數據
 */

import fs from 'fs/promises'
import path from 'path'
import type { Bill, BillEvent, VaultInfo, Payment, PaymentProgress } from '@/app/types'

const DEFAULT_DATA_FILE = path.join(process.cwd(), 'data', 'default-data.json')

interface DefaultData {
  bills: Bill[]
  events: Record<string, BillEvent[]>
  vaults: VaultInfo[]
  payments: Payment[]
  paymentProgress: Record<string, PaymentProgress>
}

let cachedData: DefaultData | null = null

/**
 * 從 default-data.json 讀取所有默認數據
 */
export async function loadDefaultData(): Promise<DefaultData> {
  // 如果已有緩存，直接返回
  if (cachedData) {
    return cachedData
  }

  try {
    const fileContent = await fs.readFile(DEFAULT_DATA_FILE, 'utf-8')
    const data: DefaultData = JSON.parse(fileContent)
    
    // 處理動態時間戳（將 0 替換為實際時間）
    const now = Date.now()
    const nowSeconds = Math.floor(now / 1000)
    
    data.bills = data.bills.map((bill, index) => ({
      ...bill,
      // 根據索引設置不同的時間
      deadline: bill.deadline === 0 ? nowSeconds + 3600 - (index * 1200) : bill.deadline,
      createdAt: bill.createdAt === 0 ? now - (index * 300000) : bill.createdAt,
      updatedAt: bill.updatedAt === 0 ? now - (index * 60000) : bill.updatedAt,
    }))
    
    // 處理事件時間戳
    Object.keys(data.events).forEach(billId => {
      data.events[billId] = data.events[billId].map((event, index) => ({
        ...event,
        timestamp: event.timestamp === 0 ? now - (index * 120000) : event.timestamp,
      }))
    })
    
    // 處理付款時間戳
    data.payments = data.payments.map(payment => ({
      ...payment,
      timestamp: payment.timestamp === 0 ? now - 120000 : payment.timestamp,
    }))
    
    // 處理 vault 更新時間
    data.vaults = data.vaults.map(vault => ({
      ...vault,
      updatedAt: vault.updatedAt === 0 ? now : vault.updatedAt,
    }))
    
    // 處理付款進度時間戳
    Object.keys(data.paymentProgress).forEach(billId => {
      const progress = data.paymentProgress[billId]
      progress.updatedAt = progress.updatedAt === 0 ? now : progress.updatedAt
      progress.chainPayments = progress.chainPayments.map(cp => ({
        ...cp,
        timestamp: cp.timestamp === 0 ? now - 120000 : cp.timestamp,
      }))
    })
    
    cachedData = data
    return data
  } catch (error) {
    console.error('讀取默認數據失敗:', error)
    // 返回空數據結構
    return {
      bills: [],
      events: {},
      vaults: [],
      payments: [],
      paymentProgress: {},
    }
  }
}

/**
 * 獲取默認帳單
 */
export async function getDefaultBills(): Promise<Bill[]> {
  const data = await loadDefaultData()
  return data.bills
}

/**
 * 獲取默認事件
 */
export async function getDefaultEvents(): Promise<Record<string, BillEvent[]>> {
  const data = await loadDefaultData()
  return data.events
}

/**
 * 獲取默認 Vaults
 */
export async function getDefaultVaults(): Promise<VaultInfo[]> {
  const data = await loadDefaultData()
  return data.vaults
}

/**
 * 獲取默認付款記錄
 */
export async function getDefaultPayments(): Promise<Payment[]> {
  const data = await loadDefaultData()
  return data.payments
}

/**
 * 獲取默認付款進度
 */
export async function getDefaultPaymentProgress(): Promise<Record<string, PaymentProgress>> {
  const data = await loadDefaultData()
  return data.paymentProgress
}

/**
 * 清除緩存（用於開發/測試）
 */
export function clearCache() {
  cachedData = null
}

