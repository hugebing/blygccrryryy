require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const { BridgeService } = require('./bridgeService');
const { MessageService } = require('./messageService');
const { bindRoutes } = require('./routes');

const PORT = process.env.PORT || 3080;

async function main() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.use(morgan('dev'));

  // 目的鏈預設設定（B 端）
  const bridgeSvc = new BridgeService(
    process.env.DEST_RPC_URL,
    process.env.BRIDGE_ADDRESS,
    process.env.PRIVATE_KEY
  );

  // 聚合服務
  const messageSvc = new MessageService(bridgeSvc);

  // 綁路由
  app.use(bindRoutes(bridgeSvc, messageSvc));

  app.listen(PORT, () => {
    console.log(`XChain Receipt-Proof service up on :${PORT}`);
  });
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
