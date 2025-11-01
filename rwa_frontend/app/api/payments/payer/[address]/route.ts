/**
 * 付款記錄 API - GET 根據付款人地址獲取付款記錄
 */

import { NextResponse } from 'next/server'
import { getPaymentsByPayer } from '../../../../../lib/paymentStorage'

export async function GET(
  request: Request,
  { params }: { params: { address: string } }
) {
  try {
    const { address } = params
    
    if (!address) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少付款人地址',
        },
        { status: 400 }
      )
    }
    
    const payments = await getPaymentsByPayer(address)
    
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

