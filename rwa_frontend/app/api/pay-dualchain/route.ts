import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// 配置更長的超時時間（60 秒）
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { billId } = body

    if (!billId) {
      return NextResponse.json(
        { ok: false, error: 'billId is required' },
        { status: 400 }
      )
    }

    console.log('🔗 服務器端調用圈存 API...')
    console.log('📤 請求參數:', { billId })
    console.log('⏳ 預計等待時間: 30-40 秒')

    // 使用 curl 調用後端 API（服務器端執行，無 CORS 問題）
    const curlCommand = `curl -X POST "https://christiana-microsporic-edwardo.ngrok-free.dev/pay-dualchain" \
      -H "Content-Type: application/json" \
      -d '${JSON.stringify({ billId })}' \
      -s \
      --max-time 60`

    console.log('🚀 執行 curl 命令...')
    
    const startTime = Date.now()
    const { stdout, stderr } = await execAsync(curlCommand)
    const duration = ((Date.now() - startTime) / 1000).toFixed(1)

    console.log(`✅ API 回應完成 (耗時: ${duration}秒)`)

    if (stderr) {
      console.error('⚠️ curl stderr:', stderr)
    }

    // 解析 JSON 回應
    let result
    try {
      result = JSON.parse(stdout)
      console.log('📦 curl 返回的完整 API 回應:', JSON.stringify(result, null, 2))
      
      // 提取並顯示交易 Hash
      if (result.ok && result.result && result.result.perChain) {
        console.log('🔗 從 curl 提取到的交易 Hash:')
        result.result.perChain.forEach((chain: any) => {
          console.log(`  - ${chain.chain} (${chain.chainId}): ${chain.txHash}`)
        })
      } else {
        console.warn('⚠️ API 回應中缺少 perChain 數據')
      }
    } catch (parseError) {
      console.error('❌ JSON 解析失敗:', stdout.substring(0, 500))
      return NextResponse.json(
        { ok: false, error: 'Invalid JSON response from backend', raw: stdout.substring(0, 500) },
        { status: 500 }
      )
    }

    // 返回結果給前端
    console.log('✅ 將 curl 結果返回給前端')
    return NextResponse.json(result)

  } catch (error: any) {
    console.error('❌ 服務器端 API 調用失敗:', error)
    
    // 處理超時錯誤
    if (error.killed || error.signal === 'SIGTERM') {
      return NextResponse.json(
        { ok: false, error: 'Request timeout (60s)', killed: true },
        { status: 504 }
      )
    }

    return NextResponse.json(
      { ok: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

