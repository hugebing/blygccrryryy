/**
 * 通用工具函數
 */

/**
 * 縮短錢包地址
 * @param address 完整地址 (0x...)
 * @param prefixLength 前綴長度（不含0x）
 * @param suffixLength 後綴長度
 * @returns 縮短後的地址，例如 "0x1234...5678"
 */
export function shortenAddress(
  address: string,
  prefixLength: number = 6,
  suffixLength: number = 4
): string {
  if (!address || address.length < prefixLength + suffixLength + 2) {
    return address
  }
  
  // 0x 開頭的 2 個字符 + prefixLength 個字符
  const prefix = address.slice(0, 2 + prefixLength)
  // 最後 suffixLength 個字符
  const suffix = address.slice(-suffixLength)
  
  return `${prefix}...${suffix}`
}

