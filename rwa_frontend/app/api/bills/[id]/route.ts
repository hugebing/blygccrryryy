/**
 * 單個帳單 API - GET /api/bills/[id]
 */

import { NextRequest, NextResponse } from 'next/server'
import { getBillById } from '@/lib/billStorage'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const billId = params.id
    const bill = await getBillById(billId)
    
    if (!bill) {
      return NextResponse.json(
        { success: false, error: '找不到帳單' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ success: true, data: bill })
  } catch (error) {
    console.error('獲取帳單失敗:', error)
    return NextResponse.json(
      { success: false, error: '獲取帳單失敗' },
      { status: 500 }
    )
  }
}

