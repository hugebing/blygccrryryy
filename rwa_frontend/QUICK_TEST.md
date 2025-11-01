# 🧪 快速測試指南

## 📋 測試圈存 API 整合

### 1️⃣ 準備工作

確保後端 API 正在運行：
```bash
# API 端點
https://christiana-microsporic-edwardo.ngrok-free.dev/pay-dualchain
```

### 2️⃣ 測試流程

```
1. 訪問首頁
   http://localhost:3000
   ↓
2. 點擊「查看示範帳單」
   ↓
3. 選擇任一示範帳單（例如：bill-2025-0001）
   ↓
4. 點擊「配置付款」
   ↓
5. 使用「✨ 推薦」功能自動分配金額
   ↓
6. 點擊「確認簽名」
   ↓
7. 在錢包彈窗中確認簽名
   ↓
8. 觀察「送出圈存中」畫面
   ↓
9. 等待 API 回應
   ↓
10. 自動跳轉到付款成功頁面
```

### 3️⃣ 驗證結果

#### 控制台日誌

打開瀏覽器開發者工具 (F12)，在 Console 中應該看到：

```javascript
✅ 簽名成功: 0x...
📤 送出圈存到各鏈...
🔗 調用圈存 API...
📦 API 回應: {ok: true, result: {...}}
✅ 圈存成功，提取交易 Hash...
  Sepolia (11155111): 0xd19c3b...
  OP Sepolia (11155420): 0xdca0dc...
  Base Sepolia (84532): 0xf5d0a1...
💾 保存付款記錄到後端...
✅ 付款記錄已保存: payment-2025-XXXX
```

#### 付款成功頁面

應該顯示：
- ✅ 每條鏈都有真實的 txHash (不是隨機的)
- ✅ 每個 txHash 可以點擊「查看 ↗」跳轉到區塊瀏覽器
- ✅ 所有鏈的狀態都是「✓ 已確認」

### 4️⃣ 測試 API 請求

使用 curl 手動測試 API：

```bash
curl -sS -X POST "https://christiana-microsporic-edwardo.ngrok-free.dev/pay-dualchain" \
  -H "content-type: application/json" \
  -d '{"billId":"bill-2025-0001"}'
```

**預期回應**:
```json
{
  "ok": true,
  "result": {
    "root": "0x...",
    "billId": "0x...",
    "perChain": [
      {
        "chain": "Sepolia",
        "chainId": "11155111",
        "userOpHash": "0x...",
        "txHash": "0x..."
      },
      ...
    ]
  }
}
```

### 5️⃣ 驗證數據持久化

#### 檢查 data/payments.json

```bash
cat data/payments.json | jq '.[-1]'
```

應該看到最新的付款記錄，包含真實的 txHash：

```json
{
  "id": "payment-2025-XXXX",
  "billId": "bill-2025-0001",
  "allocations": [
    {
      "assetSymbol": "USDT",
      "chains": [
        {
          "chainId": 11155111,
          "amount": "1250.50",
          "txHash": "0xd19c3b02b92a28c40f9ec466df89e867bf7a1999db128bd05c855ef4d5eeb7ae",
          "status": "confirmed"
        }
      ]
    }
  ]
}
```

#### 檢查帳單狀態

訪問商戶帳單列表：
```
http://localhost:3000/m/bills
```

找到測試的帳單，狀態應該是「✅ 已達標」

### 6️⃣ 測試錯誤處理

#### 測試 API 失敗場景

1. **停止後端 API**
2. 重複上述測試流程
3. 應該看到：
   ```javascript
   ❌ 圈存 API 調用失敗: TypeError: Failed to fetch
   ⚠️ 使用模擬 Hash 作為後備
   💾 保存付款記錄到後端...
   ✅ 付款記錄已保存
   ```
4. 付款流程應該正常完成（使用模擬 Hash）

### 7️⃣ 驗證區塊鏈交易

#### 在區塊瀏覽器中查看

從付款成功頁面點擊任一「查看 ↗」按鈕，應該：
- ✅ 打開對應鏈的區塊瀏覽器
- ✅ 顯示真實的交易詳情
- ✅ 交易狀態為 Success

#### 區塊瀏覽器 URL 示例

- **Sepolia**: https://sepolia.etherscan.io/tx/0xd19c3b...
- **Base Sepolia**: https://sepolia.basescan.org/tx/0xf5d0a1...
- **OP Sepolia**: https://sepolia-optimism.etherscan.io/tx/0xdca0dc...

## ✅ 檢查清單

- [ ] 後端 API 正在運行
- [ ] 錢包已連接
- [ ] 能夠完成簽名
- [ ] 能夠看到圈存 API 調用日誌
- [ ] txHash 是真實的（來自 API）
- [ ] 付款記錄已保存
- [ ] 帳單狀態已更新為 fulfilled
- [ ] 可以在區塊瀏覽器中查看交易
- [ ] API 失敗時有後備機制

## 🐛 常見問題

### Q: API 調用返回 CORS 錯誤

**A**: 確保後端 API 允許來自前端域名的請求。

### Q: txHash 是隨機生成的

**A**: 
1. 檢查 API 是否正常響應
2. 查看控制台是否有錯誤
3. 驗證 API 回應格式是否正確

### Q: 帳單狀態沒有更新

**A**: 
1. 檢查是否所有資產都已付款
2. 查看控制台日誌中的「檢查付款完成度」部分
3. 確認 API `/api/bills/[id]/status` 調用成功

## 📊 測試結果記錄

| 項目 | 狀態 | 備註 |
|------|------|------|
| API 調用成功 | ⬜ | |
| txHash 正確映射 | ⬜ | |
| 數據持久化 | ⬜ | |
| 帳單狀態更新 | ⬜ | |
| 區塊瀏覽器鏈接 | ⬜ | |
| 錯誤處理機制 | ⬜ | |

## 🎉 成功標準

所有以下條件都滿足：
- ✅ API 成功調用並返回數據
- ✅ 真實 txHash 顯示在付款成功頁面
- ✅ txHash 保存到 data/payments.json
- ✅ 可以在區塊瀏覽器中查看交易
- ✅ 帳單狀態更新為 fulfilled
- ✅ API 失敗時流程不中斷

