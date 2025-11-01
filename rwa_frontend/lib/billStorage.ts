/**
 * 帳單文件存儲 - 服務器端數據管理
 * 數據存儲在 data/bills.json
 * 默認數據從 data/default-data.json 讀取（唯一數據源）
 */

import fs from 'fs/promises'
import path from 'path'
import type { Bill } from '@/app/types'
import { getDefaultBills } from './dataLoader'

// 數據文件路徑
const DATA_DIR = path.join(process.cwd(), 'data')
const BILLS_FILE = path.join(DATA_DIR, 'bills.json')

// 確保數據目錄存在
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR)
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true })
  }
}

// 讀取帳單文件
async function readBillsFile(): Promise<Bill[]> {
  await ensureDataDir()
  
  try {
    const data = await fs.readFile(BILLS_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    // 文件不存在或讀取失敗，從 default-data.json 載入默認帳單並創建文件
    const defaultBills = await getDefaultBills()
    await writeBillsFile(defaultBills)
    return defaultBills
  }
}

// 寫入帳單文件
async function writeBillsFile(bills: Bill[]): Promise<void> {
  await ensureDataDir()
  await fs.writeFile(BILLS_FILE, JSON.stringify(bills, null, 2), 'utf-8')
}

// ============ 導出的 API 函數 ============

// 獲取所有帳單
export async function getAllBills(): Promise<Bill[]> {
  return await readBillsFile()
}

// 獲取單個帳單
export async function getBillById(id: string): Promise<Bill | null> {
  const bills = await readBillsFile()
  return bills.find(bill => bill.id === id) || null
}

// 建立新帳單
export async function createNewBill(data: Partial<Bill>): Promise<Bill> {
  const bills = await readBillsFile()
  
  // 產生銷帳編號：bill-2025-2001 格式（新帳單從 2001 開始）
  const now = new Date()
  const year = now.getFullYear()
  const existingBills = bills.filter(b => b.id.startsWith(`bill-${year}-`))
  
  // 找出最大的編號
  let maxNumber = 2000 // 新帳單從 2001 開始
  existingBills.forEach(bill => {
    const match = bill.id.match(/bill-\d{4}-(\d{4})/)
    if (match) {
      const num = parseInt(match[1], 10)
      if (num > maxNumber) {
        maxNumber = num
      }
    }
  })
  
  const nextNumber = maxNumber + 1
  const billId = `bill-${year}-${String(nextNumber).padStart(4, '0')}`
  
  const newBill: Bill = {
    id: billId,
    payeeAddress: data.payeeAddress || '0x0000000000000000000000000000000000000000',
    description: data.description || '',
    assetRules: data.assetRules || [],
    deadline: data.deadline || Math.floor(Date.now() / 1000) + 3600,
    status: 'pending',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    paymentUrl: `https://pay.咔鏘.com/i/${billId}`,
  }
  
  bills.push(newBill)
  await writeBillsFile(bills)
  
  return newBill
}

// 更新帳單
export async function updateBill(id: string, data: Partial<Bill>): Promise<Bill | null> {
  const bills = await readBillsFile()
  const index = bills.findIndex(bill => bill.id === id)
  
  if (index === -1) {
    return null
  }
  
  bills[index] = {
    ...bills[index],
    ...data,
    id: bills[index].id, // 確保 ID 不被修改
    updatedAt: Date.now(),
  }
  
  await writeBillsFile(bills)
  return bills[index]
}

// 刪除帳單
export async function deleteBill(id: string): Promise<boolean> {
  const bills = await readBillsFile()
  const filteredBills = bills.filter(bill => bill.id !== id)
  
  if (filteredBills.length === bills.length) {
    return false // 沒找到要刪除的帳單
  }
  
  await writeBillsFile(filteredBills)
  return true
}

// 重置為默認帳單
export async function resetToDefaultBills(): Promise<void> {
  const defaultBills = await getDefaultBills()
  await writeBillsFile(defaultBills)
}

// 清空所有帳單（包括默認帳單）
export async function clearAllBills(): Promise<void> {
  await writeBillsFile([])
}

