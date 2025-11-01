/**
 * 付款記錄 API - POST 創建新付款記錄
 */

import { NextRequest, NextResponse } from 'next/server'
import { createPaymentRecord } from '../../../../lib/paymentStorage'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    // 驗證必要欄位
    if (!data.billId || !data.payerAddress || !data.payeeAddress) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少必要欄位：billId, payerAddress, payeeAddress',
        },
        { status: 400 }
      )
    }
    
    const payment = await createPaymentRecord(data)
    
    return NextResponse.json({
      success: true,
      data: payment,
    })
  } catch (error: any) {
    console.error('創建付款記錄失敗:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || '創建付款記錄失敗',
      },
      { status: 500 }
    )
  }
}

