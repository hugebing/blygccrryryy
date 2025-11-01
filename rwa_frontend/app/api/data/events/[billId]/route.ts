/**
 * 獲取帳單事件 API - GET /api/data/events/[billId]
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDefaultEvents } from '@/lib/dataLoader'

export async function GET(
  request: NextRequest,
  { params }: { params: { billId: string } }
) {
  try {
    const billId = params.billId
    const allEvents = await getDefaultEvents()
    const events = allEvents[billId] || []
    
    return NextResponse.json({ success: true, data: events })
  } catch (error) {
    console.error('獲取事件失敗:', error)
    return NextResponse.json(
      { success: false, error: '獲取事件失敗' },
      { status: 500 }
    )
  }
}

