/**
 * 建立帳單 API - POST /api/bills/create
 */

import { NextRequest, NextResponse } from 'next/server'
import { createNewBill } from '@/lib/billStorage'
import type { Bill } from '@/app/types'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json() as Partial<Bill>
    
    // 驗證必要欄位
    if (!data.description || !data.payeeAddress || !data.assetRules || data.assetRules.length === 0) {
      return NextResponse.json(
        { success: false, error: '缺少必要欄位' },
        { status: 400 }
      )
    }
    
    const newBill = await createNewBill(data)
    
    return NextResponse.json({ success: true, data: newBill })
  } catch (error) {
    console.error('建立帳單失敗:', error)
    return NextResponse.json(
      { success: false, error: '建立帳單失敗' },
      { status: 500 }
    )
  }
}

