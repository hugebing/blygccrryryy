/**
 * 付款記錄儲存管理
 * 類似 billStorage.ts，用於管理付款記錄的持久化
 */

import fs from 'fs/promises'
import path from 'path'
import type { ChainId } from '../app/types'

// 付款記錄類型
export interface PaymentRecord {
  id: string // 付款記錄 ID (payment-YYYY-NNNN)
  billId: string // 關聯的帳單 ID
  payerAddress: string // 付款人地址
  payeeAddress: string // 收款人地址
  description: string // 帳單描述
  signature: string // ERC-191 簽名
  timestamp: number // 付款時間戳
  status: 'completed' | 'pending' | 'failed' // 付款狀態
  allocations: Array<{
    assetSymbol: string
    assetType: string
    assetName?: string
    assetDecimals: number
    totalAmount: string
    chains: Array<{
      chainId: ChainId
      amount: string
      txHash?: string // 交易 hash
      status?: 'pending' | 'confirmed' | 'failed' // 交易狀態
    }>
  }>
}

const DATA_DIR = path.join(process.cwd(), 'data')
const PAYMENTS_FILE = path.join(DATA_DIR, 'payments.json')

// 確保 data 目錄存在
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR)
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true })
  }
}

// 讀取付款記錄文件
async function readPaymentsFile(): Promise<PaymentRecord[]> {
  await ensureDataDir()
  
  try {
    const data = await fs.readFile(PAYMENTS_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    // 文件不存在，返回空數組並創建文件
    await writePaymentsFile([])
    return []
  }
}

// 寫入付款記錄文件
async function writePaymentsFile(payments: PaymentRecord[]): Promise<void> {
  await ensureDataDir()
  await fs.writeFile(PAYMENTS_FILE, JSON.stringify(payments, null, 2), 'utf-8')
}

// 獲取所有付款記錄
export async function getAllPayments(): Promise<PaymentRecord[]> {
  return await readPaymentsFile()
}

// 根據 ID 獲取付款記錄
export async function getPaymentById(id: string): Promise<PaymentRecord | null> {
  const payments = await readPaymentsFile()
  return payments.find(payment => payment.id === id) || null
}

// 根據付款人地址獲取付款記錄
export async function getPaymentsByPayer(payerAddress: string): Promise<PaymentRecord[]> {
  const payments = await readPaymentsFile()
  return payments.filter(payment => 
    payment.payerAddress.toLowerCase() === payerAddress.toLowerCase()
  )
}

// 根據帳單 ID 獲取付款記錄
export async function getPaymentsByBillId(billId: string): Promise<PaymentRecord[]> {
  const payments = await readPaymentsFile()
  return payments.filter(payment => payment.billId === billId)
}

// 創建新的付款記錄
export async function createPaymentRecord(data: Omit<PaymentRecord, 'id' | 'timestamp'>): Promise<PaymentRecord> {
  const payments = await readPaymentsFile()
  
  // 產生付款記錄編號：payment-2025-0001 格式（從 2001 開始）
  const now = new Date()
  const year = now.getFullYear()
  const existingPayments = payments.filter(p => p.id.startsWith(`payment-${year}-`))
  
  // 找出最大的編號
  let maxNumber = 2031 // 從 2032 開始
  existingPayments.forEach(payment => {
    const match = payment.id.match(/payment-\d{4}-(\d{4})/)
    if (match) {
      const num = parseInt(match[1], 10)
      if (num > maxNumber) {
        maxNumber = num
      }
    }
  })
  
  const nextNumber = maxNumber + 1
  const paymentId = `payment-${year}-${String(nextNumber).padStart(4, '0')}`
  
  const newPayment: PaymentRecord = {
    id: paymentId,
    timestamp: Date.now(),
    ...data,
  }
  
  payments.push(newPayment)
  await writePaymentsFile(payments)
  
  return newPayment
}

// 更新付款記錄
export async function updatePaymentRecord(id: string, updates: Partial<PaymentRecord>): Promise<PaymentRecord | null> {
  const payments = await readPaymentsFile()
  const index = payments.findIndex(p => p.id === id)
  
  if (index === -1) {
    return null
  }
  
  payments[index] = {
    ...payments[index],
    ...updates,
  }
  
  await writePaymentsFile(payments)
  return payments[index]
}

// 刪除付款記錄
export async function deletePaymentRecord(id: string): Promise<boolean> {
  const payments = await readPaymentsFile()
  const filteredPayments = payments.filter(p => p.id !== id)
  
  if (filteredPayments.length === payments.length) {
    return false // 沒有找到要刪除的記錄
  }
  
  await writePaymentsFile(filteredPayments)
  return true
}

// 清空所有付款記錄
export async function clearAllPayments(): Promise<void> {
  await writePaymentsFile([])
}

