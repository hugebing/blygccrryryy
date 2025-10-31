// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * OmniVaultRootPayV3 — billId 可重複入金；解鎖或退款後鎖單不可再用
 * - 只對「跨鏈 Merkle Root」做一次簽章（由付款人 payer 簽；EIP-191 或 signMessage(raw=root)）。
 * - 本鏈呼叫 depositByRootProof(...)：帶 billId、payer、payee、root、proof、items、sig。
 * - 驗「簽章者 = payer」＆「leaf(chainId, vault, billId, itemsHash) ∈ root」後，
 *   從 payer 扣資產進 Vault，並記在 billId 名下（可多次入金、可多付款人）。
 * - 不支援付款人自行撤回（revoke 已移除）。
 * - 中介（operator）可：
 *     * unlockAndRelease(billId)       → 直接把該 billId 的所有累計資產撥給 payee，並鎖單；
 *     * refundAllToPayers(billId)      → 把該 billId 下所有付款人的累計款「全額退回」，並鎖單；
 * - 合約不主動判斷過付/過期：由中介在鏈下彙總跨鏈狀態後，於**適當時機**呼叫退款或解鎖。
 */

import {AccessControl}        from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard}      from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {MessageHashUtils}     from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {SignatureChecker}     from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import {MerkleProof}          from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {IERC20}               from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC721}              from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC1155}             from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {SafeERC20}            from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract OmniVaultRootPay is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /* ──────────────── 角色 ──────────────── */
    bytes32 public constant ADMIN_ROLE    = DEFAULT_ADMIN_ROLE;              // 管理者
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");      // 中介人/營運

    /* ──────────────── 基本型別 ──────────────── */
    // 20=ERC20, 21=ERC721, 23=ERC1155, 43=受監管ERC20(ERC20介面)
    struct Item {
        uint8   ercCode;   // 20/21/23/43
        address token;     // 合約地址
        uint256 id;        // ERC20/受監管=0；ERC721/1155=tokenId
        uint256 amount;    // ERC20/受監管=數量；ERC721=1；ERC1155=數量
    }

    struct Bill {
        address payee;     // 收款人（首筆入金鎖定）
        bool    closed;    // true 後不可再入金（解鎖或退款任一發生即鎖單）
        bool    released;  // 是否走過解鎖撥款
        bool    refunded;  // 是否走過整單退款
    }

    // leaf 綁定：鏈別 + Vault 位址 + billId + itemsHash
    bytes32 private constant CHAIN_LEAF_TYPEHASH =
        keccak256("ChainLeaf(uint256 chainId,address vault,bytes32 billId,bytes32 itemsHash)");

    /* ──────────────── 狀態 ──────────────── */
    mapping(bytes32 => Bill) public bills;

    // leaf 去重（避免同一批次重複入金）
    mapping(bytes32 => bool) public usedLeaf;

    // bill 總表：billId 下各資產（assetKey）的「總額」（用於解鎖撥款）
    mapping(bytes32 => mapping(bytes32 => uint256)) public billTotals;

    // 付款人細項：billId 下各資產（assetKey）由各 payer 的「累計金額」（用於整單退款）
    mapping(bytes32 => mapping(bytes32 => mapping(address => uint256))) public paidByPayer;

    // bill 的資產索引（解鎖時遍歷）
    mapping(bytes32 => bytes32[]) public billAssetIndex;
    mapping(bytes32 => mapping(bytes32 => bool)) public billAssetSeen;

    // bill 下每個資產的付款人索引（退款時遍歷）
    mapping(bytes32 => mapping(bytes32 => address[])) public billAssetPayers;
    mapping(bytes32 => mapping(bytes32 => mapping(address => bool))) public billAssetPayerSeen;

    // assetKey 的靜態描述
    struct AssetMeta { uint8 ercCode; address token; uint256 id; }
    mapping(bytes32 => AssetMeta) public assetMeta;

    /* ──────────────── 事件 ──────────────── */
    event PayeeLocked(bytes32 indexed billId, address indexed payee);

    event Deposited(
        bytes32 indexed billId,
        address indexed payer,
        uint8   indexed ercCode,
        address token,
        uint256 id,
        uint256 amount,
        bytes32 leafHash,
        bytes32 root
    );

    event Released(bytes32 indexed billId, address indexed payee);
    event Refunded(bytes32 indexed billId);

    /* ──────────────── 建構 ──────────────── */
    constructor(address admin, address operator) {
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, operator);
    }

    /* ──────────────── 入金：Root 單簽 + leaf 證明 ──────────────── */
    /**
     * @notice 入金（從簽 root 的 `payer` 扣；呼叫者可為任意 relayer）
     * @param billId  銷帳編號（可多次入金，直到解鎖或退款後鎖單）
     * @param payer   付款人（EOA 或 1271 AA）
     * @param payee   收款人（首次使用該 billId 會鎖定 payee，此後必須一致）
     * @param root    跨鏈 Merkle Root（payer 對它做單次簽章）
     * @param proof   本鏈 leaf 對 root 的 Merkle 證明
     * @param items   本鏈要扣的資產明細（需依 ercCode,token,id 升冪）
     * @param sig     `payer` 對 root 的簽章（EIP-191 signMessage(raw=root)）
     */
    function depositByRootProof(
        bytes32 billId,
        address payer,
        address payee,
        bytes32 root,
        bytes32[] calldata proof,
        Item[]   calldata items,
        bytes    calldata sig
    ) external nonReentrant {
        require(payer != address(0), "PAYER_ZERO");

        Bill storage b = bills[billId];

        // 鎖定 payee；若已鎖定則必須一致；若已關單則拒絕
        if (b.payee == address(0)) {
            require(payee != address(0), "PAYEE_ZERO");
            b.payee = payee;
            emit PayeeLocked(billId, payee);
        } else {
            require(b.payee == payee, "PAYEE_MISMATCH");
        }
        require(!b.closed, "BILL_CLOSED");

        // 1) 先用 EIP-191 前綴雜湊嘗試（EOA 常見）
        bytes32 ethDigest = MessageHashUtils.toEthSignedMessageHash(root);
        bool ok = SignatureChecker.isValidSignatureNow(payer, ethDigest, sig);

        // 2) 若失敗，再用 raw root（許多 ERC-1271/AA 錢包習慣驗 raw）
        if (!ok) {
            ok = SignatureChecker.isValidSignatureNow(payer, root, sig);
        }

        require(ok, "BAD_SIG");

        // hash items & 驗 proof
        bytes32 itemsHash = _hashItemsStrict(items);
        bytes32 leafHash = keccak256(
            abi.encode(
                CHAIN_LEAF_TYPEHASH,
                block.chainid,
                address(this),
                billId,
                itemsHash
            )
        );
        require(MerkleProof.verify(proof, root, leafHash), "BAD_PROOF");
        require(!usedLeaf[leafHash], "LEAF_USED");

        // 從 payer 扣款並記帳
        for (uint256 i = 0; i < items.length; i++) {
            Item calldata it = items[i];
            bytes32 k = _assetKey(it.ercCode, it.token, it.id);

            if (assetMeta[k].token == address(0)) {
                assetMeta[k] = AssetMeta({ercCode: it.ercCode, token: it.token, id: it.id});
            }
            if (!billAssetSeen[billId][k]) {
                billAssetSeen[billId][k] = true;
                billAssetIndex[billId].push(k);
            }
            if (!billAssetPayerSeen[billId][k][payer]) {
                billAssetPayerSeen[billId][k][payer] = true;
                billAssetPayers[billId][k].push(payer);
            }

            if (it.ercCode == 20 || it.ercCode == 43) {
                IERC20(it.token).safeTransferFrom(payer, address(this), it.amount);
            } else if (it.ercCode == 21) {
                IERC721(it.token).safeTransferFrom(payer, address(this), it.id);
            } else if (it.ercCode == 23) {
                IERC1155(it.token).safeTransferFrom(payer, address(this), it.id, it.amount, "");
            } else {
                revert("BAD_ERC_CODE");
            }

            billTotals[billId][k]         += it.amount;
            paidByPayer[billId][k][payer] += it.amount;

            emit Deposited(billId, payer, it.ercCode, it.token, it.id, it.amount, leafHash, root);
        }

        usedLeaf[leafHash] = true;
    }

    /// @notice 解鎖撥款：把該 billId 的所有累計資產一次匯給 payee，並鎖單
    function unlockAndRelease(bytes32 billId) external onlyRole(OPERATOR_ROLE) nonReentrant {
        Bill storage b = bills[billId];
        address payee = b.payee;
        require(payee != address(0), "PAYEE_UNSET");
        require(!b.closed, "BILL_CLOSED");

        bytes32[] storage idx = billAssetIndex[billId];
        for (uint256 i = 0; i < idx.length; i++) {
            bytes32 k = idx[i];
            uint256 amt = billTotals[billId][k];
            if (amt == 0) continue;

            AssetMeta memory a = assetMeta[k];

            if (a.ercCode == 20 || a.ercCode == 43) {
                IERC20(a.token).safeTransfer(payee, amt);
            } else if (a.ercCode == 21) {
                // ERC721：總額應為 1
                require(amt == 1, "ERC721_TOTAL");
                IERC721(a.token).safeTransferFrom(address(this), payee, a.id);
            } else if (a.ercCode == 23) {
                IERC1155(a.token).safeTransferFrom(address(this), payee, a.id, amt, "");
            } else {
                revert("BAD_ERC_CODE");
            }

            billTotals[billId][k] = 0;
        }

        b.closed   = true;
        b.released = true;
        emit Released(billId, payee);
    }

    /// @notice 整單退款：將該 billId 下所有付款人的所有資產全數退回，並鎖單
    /// @dev 「過付」或「過期」由中介在鏈下確認後呼叫此函式。
    function refundAllToPayers(bytes32 billId) external onlyRole(OPERATOR_ROLE) nonReentrant {
        Bill storage b = bills[billId];
        require(!b.closed, "BILL_CLOSED");

        bytes32[] storage idx = billAssetIndex[billId];
        for (uint256 i = 0; i < idx.length; i++) {
            bytes32 k = idx[i];
            AssetMeta memory a = assetMeta[k];
            address[] storage payers = billAssetPayers[billId][k];

            for (uint256 j = 0; j < payers.length; j++) {
                address p = payers[j];
                uint256 amt = paidByPayer[billId][k][p];
                if (amt == 0) continue;

                // 清帳
                paidByPayer[billId][k][p] = 0;
                billTotals[billId][k]    -= amt;

                // 退款
                if (a.ercCode == 20 || a.ercCode == 43) {
                    IERC20(a.token).safeTransfer(p, amt);
                } else if (a.ercCode == 21) {
                    require(amt == 1, "ERC721_REFUND_AMT");
                    IERC721(a.token).safeTransferFrom(address(this), p, a.id);
                } else if (a.ercCode == 23) {
                    IERC1155(a.token).safeTransferFrom(address(this), p, a.id, amt, "");
                } else {
                    revert("BAD_ERC_CODE");
                }
            }
        }

        b.closed   = true;
        b.refunded = true;
        emit Refunded(billId);
    }

    /* ──────────────── 輔助 ──────────────── */

    /// 嚴格雜湊 items（僅允許 20/21/23/43；需依 (ercCode, token, id) 升冪排序）
    function _hashItemsStrict(Item[] calldata items) internal pure returns (bytes32) {
        for (uint256 i = 0; i < items.length; i++) {
            uint8 code = items[i].ercCode;
            require(code == 20 || code == 21 || code == 23 || code == 43, "UNSUPPORTED_ERC");
            if (i > 0) {
                Item calldata a = items[i - 1];
                Item calldata b = items[i];
                bool ok = (a.ercCode < b.ercCode) ||
                          (a.ercCode == b.ercCode && a.token < b.token) ||
                          (a.ercCode == b.ercCode && a.token == b.token && a.id <= b.id);
                require(ok, "ITEMS_UNSORTED");
            }
        }
        bytes32 acc = keccak256("");
        for (uint256 i = 0; i < items.length; i++) {
            acc = keccak256(
                abi.encode(
                    acc,
                    keccak256(abi.encode(items[i].ercCode, items[i].token, items[i].id, items[i].amount))
                )
            );
        }
        return acc;
    }

    function _assetKey(uint8 code, address token, uint256 id) internal pure returns (bytes32) {
        return keccak256(abi.encode(code, token, id));
    }

    /* ERC 接收回呼（為收 ERC721/1155 必備） */
    function onERC1155Received(address, address, uint256, uint256, bytes calldata)
        external pure returns (bytes4)
    { return this.onERC1155Received.selector; }

    function onERC1155BatchReceived(address, address, uint256[] calldata, uint256[] calldata, bytes calldata)
        external pure returns (bytes4)
    { return this.onERC1155BatchReceived.selector; }

    function onERC721Received(address, address, uint256, bytes calldata)
        external pure returns (bytes4)
    { return this.onERC721Received.selector; }
}