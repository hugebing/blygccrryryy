/**
 * 咔鏘 多鏈支付平台 - TypeScript 類型定義
 */

// ============ 鏈相關 ============
export type ChainId = 11155111 | 84532 | 11155420; // Sepolia, Base Sepolia, OP Sepolia

export interface ChainConfig {
  id: ChainId;
  name: string;
  symbol: string;
  explorer: string;
  rpcUrl: string;
  icon?: string;
}

// ============ 資產類型 ============
export type AssetType = 'ERC20' | 'ERC721' | 'ERC1155' | 'ERC3643' | 'NATIVE';

export interface Asset {
  type: AssetType;
  symbol: string;
  name: string;
  address?: `0x${string}`; // NATIVE 類型沒有地址，NFT 為 collection 地址
  decimals?: number; // NFT 沒有 decimals
  chainId: ChainId;
  icon?: string;
  tokenId?: string; // NFT 的 token ID
  collectionName?: string; // NFT collection 名稱
}

// ============ 支付規則 ============
export interface ChainLimit {
  chainId: ChainId;
  vaultAddress: `0x${string}`; // 該鏈的 Vault 合約地址
}

export interface AssetRule {
  asset: Asset;
  totalRequired: string; // 總需求金額
  chainLimits: ChainLimit[]; // 各鏈限制
}

// ============ 帳單 ============
export type BillStatus = 
  | 'draft'           // 草稿
  | 'pending'         // 待付款
  | 'partial'         // 部分付款
  | 'fulfilled'       // 已達標
  | 'claimed'         // 已領款
  | 'expired'         // 已過期
  | 'refunding'       // 退款中
  | 'refunded'        // 已退款
  | 'cancelled';      // 已取消

export interface Bill {
  id: string;                     // 銷帳編號 (格式: bill-2025-0001)
  payeeAddress: `0x${string}`;    // 收款戶錢包地址
  description: string;            // 描述
  assetRules: AssetRule[];        // 資產規則（可能包含多種資產）
  deadline: number;               // 截止時間戳（秒）
  status: BillStatus;
  createdAt: number;
  updatedAt: number;
  paymentUrl?: string;            // 付款短連結
}

// ============ 付款進度 ============
export type PaymentStage = 
  | 'idle'              // 未開始
  | 'approving'         // 授權中
  | 'approved'          // 已授權
  | 'depositing'        // 入金中
  | 'confirming'        // 確認中
  | 'confirmed'         // 已確認
  | 'failed'            // 失敗
  | 'stuck';            // 卡住

export interface ChainPayment {
  chainId: ChainId;
  asset: Asset;
  amount: string;                 // 已付金額
  required: string;               // 需求金額
  stage: PaymentStage;
  txHash?: `0x${string}`;
  confirmations?: number;
  errorMessage?: string;
  timestamp?: number;
}

export interface PaymentProgress {
  billId: string;
  payerAddress: `0x${string}`;
  chainPayments: ChainPayment[];  // 各鏈付款狀態
  totalPaid: string;              // 總已付金額
  totalRequired: string;          // 總需求金額
  isFulfilled: boolean;           // 是否已達標
  updatedAt: number;
}

// 單筆付款記錄
export interface Payment {
  id: string;
  billId: string;
  payerAddress: `0x${string}`;
  chainId: ChainId;
  assetSymbol: string;
  amount: string;
  txHash?: `0x${string}`;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: number;
}

// ============ MCPI (Multi-Chain Payment Intent) ============
export interface MCPI {
  billId: string;
  payerAddress: `0x${string}`;
  chainIntents: {
    chainId: ChainId;
    asset: Asset;
    amount: string;
    vaultAddress: `0x${string}`;
  }[];
  deadline: number;
  nonce: string;                  // 防重放碼
  signature?: `0x${string}`;      // 簽名
  createdAt: number;
}

// ============ Vault ============
export interface VaultInfo {
  chainId: ChainId;
  address: `0x${string}`;
  balance: string;                // 餘額
  claimable: string;              // 可領取金額
  locked: string;                 // 鎖定金額
  lastSignatureHash?: string;     // 最近簽章摘要
  status: 'active' | 'frozen' | 'low_balance';
  updatedAt: number;
}

// ============ 事件 ============
export type EventType = 
  | 'bill.created'
  | 'deposit.detected'
  | 'deposit.confirmed'
  | 'fulfillment.updated'
  | 'fulfillment.completed'
  | 'claimable.created'
  | 'claim.executed'
  | 'refund.available'
  | 'refund.executed'
  | 'bill.expired'
  | 'bill.cancelled'
  | 'anomaly.detected';

export type AnomalyType = 
  | 'overpaid'          // 超額
  | 'underpaid'         // 少額
  | 'chain_stuck'       // 鏈卡住
  | 'approval_missing'  // 授權缺失
  | 'unsupported_chain' // 非支援鏈入金
  | 'duplicate_payment'; // 重複付款

export interface BillEvent {
  id: string;
  billId: string;
  type: EventType;
  chainId?: ChainId;
  txHash?: `0x${string}`;
  address?: `0x${string}`;
  amount?: string;
  message: string;
  anomalyType?: AnomalyType;
  metadata?: Record<string, any>;
  timestamp: number;
}

// ============ 對帳 ============
export interface ReconciliationRecord {
  billId: string;
  payeeAddress: `0x${string}`;
  totalReceived: string;
  totalClaimable: string;
  totalClaimed: string;
  totalRefunded: string;
  status: BillStatus;
  isReconciled: boolean;
  note?: string;
  reconciledAt?: number;
  reconciledBy?: string;
}

// ============ Webhook ============
export interface WebhookConfig {
  url: string;
  secret: string;
  events: EventType[];
  retryStrategy: {
    maxRetries: number;
    backoffMs: number;
  };
  isActive: boolean;
}

// ============ UI 狀態 ============
export interface UIState {
  isModalOpen: boolean;
  modalType?: 'mcpi' | 'claim' | 'refund' | 'settings';
  selectedBillId?: string;
  selectedChainId?: ChainId;
  toast?: {
    type: 'success' | 'warning' | 'error' | 'info';
    message: string;
    txHash?: `0x${string}`;
  };
}

