/**
 * 帳單 API - GET /api/bills
 * 獲取所有帳單
 */

import { NextResponse } from 'next/server'
import { getAllBills } from '@/lib/billStorage'

export async function GET() {
  try {
    const bills = await getAllBills()
    return NextResponse.json({ success: true, data: bills })
  } catch (error) {
    console.error('獲取帳單失敗:', error)
    return NextResponse.json(
      { success: false, error: '獲取帳單失敗' },
      { status: 500 }
    )
  }
}

