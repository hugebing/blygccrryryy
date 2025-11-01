/**
 * 付款記錄 API - GET 所有付款記錄
 */

import { NextResponse } from 'next/server'
import { getAllPayments } from '../../../lib/paymentStorage'

export async function GET() {
  try {
    const payments = await getAllPayments()
    
    return NextResponse.json({
      success: true,
      data: payments,
    })
  } catch (error: any) {
    console.error('獲取付款記錄失敗:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || '獲取付款記錄失敗',
      },
      { status: 500 }
    )
  }
}

