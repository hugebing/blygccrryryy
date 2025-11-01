/**
 * 獲取 Vaults API - GET /api/data/vaults
 */

import { NextResponse } from 'next/server'
import { getDefaultVaults } from '@/lib/dataLoader'

export async function GET() {
  try {
    const vaults = await getDefaultVaults()
    return NextResponse.json({ success: true, data: vaults })
  } catch (error) {
    console.error('獲取 Vaults 失敗:', error)
    return NextResponse.json(
      { success: false, error: '獲取 Vaults 失敗' },
      { status: 500 }
    )
  }
}

