/**
 * 付款記錄 API - GET 根據帳單 ID 獲取付款記錄
 */

import { NextResponse } from 'next/server'
import { getPaymentsByBillId } from '../../../../../lib/paymentStorage'

export async function GET(
  request: Request,
  { params }: { params: { billId: string } }
) {
  try {
    const { billId } = params
    
    if (!billId) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少帳單 ID',
        },
        { status: 400 }
      )
    }
    
    const payments = await getPaymentsByBillId(billId)
    
    // 轉換為商戶頁面期望的 Payment 格式
    const formattedPayments = payments.flatMap(paymentRecord => {
      // 將每個 allocation 的每條鏈轉換為獨立的 Payment 記錄
      return paymentRecord.allocations.flatMap(allocation => 
        allocation.chains.map(chain => ({
          id: `${paymentRecord.id}-${allocation.assetSymbol}-${chain.chainId}`,
          billId: paymentRecord.billId,
          payerAddress: paymentRecord.payerAddress,
          assetSymbol: allocation.assetSymbol,
          assetType: allocation.assetType,
          amount: chain.amount,
          chainId: chain.chainId,
          txHash: chain.txHash || '',
          status: chain.status || 'pending',
          timestamp: paymentRecord.timestamp,
        }))
      )
    })
    
    return NextResponse.json({
      success: true,
      data: formattedPayments,
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

