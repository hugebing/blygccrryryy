/**
 * 重置帳單 API - POST /api/bills/reset
 * 清空所有用戶建立的帳單，恢復為默認示範帳單
 */

import { NextResponse } from 'next/server'
import { resetToDefaultBills } from '@/lib/billStorage'

export async function POST() {
  try {
    await resetToDefaultBills()
    
    return NextResponse.json({ 
      success: true, 
      message: '已重置為默認示範帳單' 
    })
  } catch (error) {
    console.error('重置帳單失敗:', error)
    return NextResponse.json(
      { success: false, error: '重置帳單失敗' },
      { status: 500 }
    )
  }
}

