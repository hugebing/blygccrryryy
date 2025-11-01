/**
 * 重置數據文件腳本
 * 用於清理舊的數據並重新開始
 * 
 * 注意：此腳本只刪除 bills.json，不會修改 default-data.json
 * default-data.json 是唯一的數據源，需要手動編輯
 */

const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const billsFile = path.join(dataDir, 'bills.json');
const defaultDataFile = path.join(dataDir, 'default-data.json');

console.log('🔄 重置數據文件...\n');

// 檢查 data 目錄是否存在
if (fs.existsSync(dataDir)) {
  console.log('✓ 找到 data 目錄');
  
  // 檢查 bills.json 是否存在
  if (fs.existsSync(billsFile)) {
    // 備份舊文件
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupFile = path.join(dataDir, `bills_backup_${timestamp}.json`);
    
    fs.copyFileSync(billsFile, backupFile);
    console.log(`✓ 已備份舊數據到: ${path.basename(backupFile)}`);
    
    // 刪除舊文件
    fs.unlinkSync(billsFile);
    console.log('✓ 已刪除舊的 bills.json');
  } else {
    console.log('ℹ bills.json 不存在，無需刪除');
  }
  
  // 檢查 default-data.json 是否存在
  if (fs.existsSync(defaultDataFile)) {
    console.log('✓ default-data.json 存在（未修改）');
  } else {
    console.warn('⚠️  警告：找不到 default-data.json！');
    console.warn('   請確保該文件存在，否則系統無法生成默認數據');
  }
} else {
  console.log('ℹ data 目錄不存在，無需刪除');
}

console.log('\n✅ 重置完成！');
console.log('💡 提示：');
console.log('   - bills.json 已刪除');
console.log('   - 下次訪問應用時，系統會從 default-data.json 生成新數據');
console.log('   - 要修改默認數據，請編輯 data/default-data.json\n');

