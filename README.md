# 咔鏘 Ka-ching

**咔鏘是企業級多鏈支付解決方案，付款人多鏈支付僅需一個簽章，且不需原生代幣當手續費，掃 QRCode 就能快速支付，還有提供銷帳編號，供收款方快速對帳。**

需要更多資訊可查看簡報 [deck](https://www.canva.com/design/DAG3U8o488c/kRBcM2mbQTyOsp4k5xSvug/view?utm_content=DAG3U8o488c&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=h1f566146b4)

## Overview

很多 RWA 資產不適合跨鏈，咔鏘可以在資產不跨鏈的情況下，完成多鏈支付，例如：需要在 A 鏈支付股票代幣，同時又要在 B 鏈支付代幣化黃金，就可以使用咔鏘。咔鏘以「條件式結算」確保兩筆款項都成功入帳才視為完成。

咔鏘透過 AA 合約，支付時僅需簽署一次交易，並且不用支付原生手續費，就能完成多鏈支付。

## Features

- **多鏈清算資產免跨鏈:**  
  付款人將資產轉入 vault 圈存，再透過咔鏘偵測鏈上事件，控制資產解鎖。

- **付款人僅需簽章一次:**  
  透過 AA Wallet 及交易樹達到付款人僅需簽章一次的目標。

- **免用原生代幣手續費:**  
  透過 AA Wallet 的 Paymaster 做到。

- **銷帳編號對帳超方便:**  
  多鏈清算複雜度高，透過銷帳編號支付、對帳超方便。

  
## How It Works

1. **AA Wallet:**  
   採用 ZeroDev AA 錢包，付款人簽一個簽章後，由咔鏘製作多個 User Operations 再交由 ZeroDev 執行，達成多鏈數筆授權及轉帳的目的。

2. **銷帳編號產生對應 QRCode:**  
   將銷帳編號綁定收款資訊，透過 QRCode 取得銷帳編號，就能透過咔鏘取得收款資訊就能快速支付，銷帳編號也提供收款方快速對帳。
   
4. **交易樹:**  
   為了讓使用者僅需簽一筆簽章，不同鏈的交易訊息，都會雜湊後儲存於交易樹中，使用者只要簽 root，傳送 User Operation 時，咔鏘會帶入該鏈的交易 proof，就能在該鏈上驗證。

## 部屬合約

- Sepolia
    - Vault 0x0aC4e199614AA9E58172027057d8026a87Ab8B7D
    - ZeroDev kernel 0xaE6151Eb1558A5cFb8c41Af86b5E60899726dd82
    - ERC20 Token 0x71549C631F6E3a506D2B19f7DEF17E788C9C04f6
    - ERC721 Token 0xCeE4D76e247482F6CFfd78b007646e5A3725ed9D
- Arbitrum Sepolia
    - Vault 0xCE4C16288aFF3939be547ac05652E2d69AC815C0
    - ZeroDev kernel 0xaE6151Eb1558A5cFb8c41Af86b5E60899726dd82
    - ERC20 Token 0x7E64D70D8FE71943987cC8BB7F7e2AEBA67bc3f1
    - ERC1155 Token 0x0B5C0E7F4D4E4BD2e4847727c7386f7C23d4a3F8
- Optimism Sepolia
    - Vault 0xaE6151Eb1558A5cFb8c41Af86b5E60899726dd82
    - ZeroDev kernel 0xaE6151Eb1558A5cFb8c41Af86b5E60899726dd82
    - ERC20 Token 0x69fd0513C9EDDD4bCE675D759509f3EafC5A4b42
    - ERC1155 Token 0x7E64D70D8FE71943987cC8BB7F7e2AEBA67bc3f1
- Base Sepolia
    - Vault 0x1540c6d6cB6d032B661473F0B966FED98b6B6F31
    - ZeroDev kernel 0xaE6151Eb1558A5cFb8c41Af86b5E60899726dd82
    - ERC20 Token 0x69fd0513C9EDDD4bCE675D759509f3EafC5A4b42
    - ERC721 Token 0x7E64D70D8FE71943987cC8BB7F7e2AEBA67bc3f1
- Zircuit
    - Vault 0x1A262e63150686EA9aA2704e9182232F67687791

## License

This project is licensed under the MIT License.
