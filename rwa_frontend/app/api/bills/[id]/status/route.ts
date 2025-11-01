/**
 * 帳單狀態更新 API - PATCH 更新帳單狀態
 */

import { NextRequest, NextResponse } from 'next/server'
import { updateBill, getBillById } from '../../../../../lib/billStorage'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const { status } = await request.json()
    
    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少帳單 ID',
        },
        { status: 400 }
      )
    }
    
    if (!status) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少狀態參數',
        },
        { status: 400 }
      )
    }
    
    // 檢查帳單是否存在
    const existingBill = await getBillById(id)
    if (!existingBill) {
      return NextResponse.json(
        {
          success: false,
          error: '找不到帳單',
        },
        { status: 404 }
      )
    }
    
    // 更新帳單狀態
    const updatedBill = await updateBill(id, {
      status,
      updatedAt: Date.now(),
    })
    
    if (!updatedBill) {
      return NextResponse.json(
        {
          success: false,
          error: '更新帳單失敗',
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: updatedBill,
    })
  } catch (error: any) {
    console.error('更新帳單狀態失敗:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || '更新帳單狀態失敗',
      },
      { status: 500 }
    )
  }
}

