// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// ---- Minimal LZ base ----
interface ILayerZeroEndpoint {
    function send(
        uint16 _dstChainId,
        bytes calldata _destination,
        bytes calldata _payload,
        address payable _refundAddress,
        address _zroPaymentAddress,
        bytes calldata _adapterParams
    ) external payable;
}
abstract contract LzAppLite is Ownable {
    ILayerZeroEndpoint public lzEndpoint;
    mapping(uint16 => bytes) public trustedRemote;
    constructor(address _endpoint) { lzEndpoint = ILayerZeroEndpoint(_endpoint); }
    modifier onlyLzEndpoint() { require(msg.sender == address(lzEndpoint), "NotLZEndpoint"); _; }
    function setTrustedRemote(uint16 srcLzChainId, bytes calldata remote) external onlyOwner { trustedRemote[srcLzChainId] = remote; }
    function _isTrusted(uint16 srcLzChainId, bytes calldata srcAddr) internal view returns (bool) { return keccak256(trustedRemote[srcLzChainId]) == keccak256(srcAddr); }
    function _lzSend(uint16 dstChainId, bytes memory dst, bytes memory payload, bytes memory adapterParams) internal {
        lzEndpoint.send(dstChainId, dst, payload, payable(msg.sender), address(0), adapterParams);
    }
}

// ---- Shared types with Hub/Mirror ----
enum TokenType { ERC20, ERC721, ERC1155, ERC3643_ERC20 }
enum HubMsgType { POLICY_SYNC, SESSION_SYNC, RELEASE, REFUND }

struct LockedClassDelta { bytes32 classId; uint128 delta; }
struct LockedClassBatchMsg {
    bytes32 invoiceId;
    uint64  srcChainId;
    LockedClassDelta[] deltas;
    bytes32[] leafHashes;
    bytes32[] multiProof;
    bool[]    proofFlags;
}
struct PolicySyncMsg {
    bytes32 invoiceId;
    bytes32 allowlistRoot;
    uint64  deadline;
    bytes32[] classIds;
}
struct HubCommand { HubMsgType t; bytes data; }

// Mirror interface (same chain)
interface ISessionMirror {
    function sessionMeta(bytes32 sessionId) external view returns (
        bytes32 invoiceId,
        address payer,
        address payee,
        bytes32 allowlistRoot,
        uint64  deadline,
        bytes32 planHash,
        bool    exists
    );
    function checkAndConsume(bytes32 sessionId, bytes32 classId, uint128 delta) external returns (bool);
}

// ---- Vault ----
error NotHub();
error PolicyNotCached();
error InvoiceExpired();
error LeafMismatch();
error MultiproofFailed();
error SenderNotPayer();
error BadLengths();
error InsufficientPushed();

contract PerChainVault is LzAppLite, ReentrancyGuard {
    using MerkleProof for bytes32[];

    // addresses
    address public settlementHub;   // for logging/reference (EIP-712 domain held by Hub)
    uint16  public hubLzChainId;    // Hub LZ chain id
    ISessionMirror public sessionMirror; // same-chain mirror

    // cached policy root/deadline/class existence (optional UX)
    mapping(bytes32 => bytes32) public allowlistRootCache; // invoiceId -> root
    mapping(bytes32 => uint64)  public deadlineCache;      // invoiceId -> deadline
    mapping(bytes32 => mapping(bytes32 => bool)) public classKnown; // invoiceId -> classId -> true

    // accounting
    // total accounted balance per token (to compute new pushed-in available = balanceOf - accounted)
    mapping(address => uint256) public tokenAccountedTotal;
    // invoiceId -> token -> total locked
    mapping(bytes32 => mapping(address => uint256)) public erc20TotalLocked;
    // invoiceId -> token -> payer -> locked (for refunds)
    mapping(bytes32 => mapping(address => mapping(address => uint256))) public erc20LockedByPayer;

    // release/refund flags per invoice
    mapping(bytes32 => bool) public releasableInvoice;
    mapping(bytes32 => bool) public refundableInvoice;

    // events
    event PolicyCached(bytes32 indexed invoiceId, bytes32 root, uint64 deadline);
    event Locked(bytes32 indexed invoiceId, bytes32 indexed classId, address indexed payer, address token, uint256 amount);
    event Released(bytes32 indexed invoiceId, address indexed to, address token, uint256 amount);
    event Refunded(bytes32 indexed invoiceId, address indexed to, address token, uint256 amount);

    constructor(address _lzEndpoint) LzAppLite(_lzEndpoint) {}

    function setHubAndMirror(address hub, uint16 _hubLzChainId, address mirror) external onlyOwner {
        settlementHub  = hub;
        hubLzChainId   = _hubLzChainId;
        sessionMirror  = ISessionMirror(mirror);
    }

    // ----- LZ Receive: Hub commands & policy sync -----
    function lzReceive(uint16 srcLzChainId, bytes calldata srcAddr, uint64 /*nonce*/, bytes calldata payload)
        public
        override
        onlyLzEndpoint
    {
        if (!_isTrusted(srcLzChainId, srcAddr)) revert NotHub();
        HubCommand memory cmd = abi.decode(payload, (HubCommand));
        if (cmd.t == HubMsgType.POLICY_SYNC) {
            PolicySyncMsg memory s = abi.decode(cmd.data, (PolicySyncMsg));
            allowlistRootCache[s.invoiceId] = s.allowlistRoot;
            deadlineCache[s.invoiceId]      = s.deadline;
            for (uint256 i = 0; i < s.classIds.length; i++) classKnown[s.invoiceId][s.classIds[i]] = true;
            emit PolicyCached(s.invoiceId, s.allowlistRoot, s.deadline);
        } else if (cmd.t == HubMsgType.RELEASE) {
            bytes32 invoiceId = abi.decode(cmd.data, (bytes32));
            releasableInvoice[invoiceId] = true;
            refundableInvoice[invoiceId] = false;
        } else if (cmd.t == HubMsgType.REFUND) {
            bytes32 invoiceId = abi.decode(cmd.data, (bytes32));
            refundableInvoice[invoiceId] = true;
            releasableInvoice[invoiceId] = false;
        }
        // SESSION_SYNC 由 Mirror 接收
    }

    // -------- Core: AA push model (no Permit2) --------
    struct ActionRef {
        bytes32 invoiceId;
        bytes32 classId;
        address token;
        address payer;      // must be msg.sender (AA)
        address receiver;   // usually the payee
        uint256 amount;     // ERC20 amount
        uint96  nonce;      // optional, not used in push PoC
        uint64  expiry;     // per-action expiry
    }

    /// @notice AA 先把 tokens 轉入本 Vault，再呼叫本函式鎖款。
    /// 本函式會驗 session（Mirror）、multiproof（允收清單）、並以「餘額差帳本」確認確有足額新資產被推入。
    function lockPushERC20Batch(
        bytes32       sessionId,
        ActionRef[]   calldata actions,
        bytes32[]     calldata leafHashes,   // one per action
        bytes32[]     calldata multiProof,
        bool[]        calldata proofFlags
    ) external nonReentrant {
        if (actions.length != leafHashes.length) revert BadLengths();

        // 1) 讀 Mirror 的 session meta（root/deadline）
        (bytes32 invoiceId,, , bytes32 root, uint64 deadline,, bool exists) = sessionMirror.sessionMeta(sessionId);
        if (!exists) revert PolicyNotCached();
        if (block.timestamp > deadline) revert InvoiceExpired();

        // 2) 構建 leaves 並 multiproof 驗證
        bytes32[] memory leaves = new bytes32[](actions.length);
        for (uint256 i = 0; i < actions.length; i++) {
            ActionRef calldata a = actions[i];
            if (a.invoiceId != invoiceId) revert LeafMismatch();
            if (a.payer != msg.sender) revert SenderNotPayer();
            if (a.expiry < block.timestamp) revert InvoiceExpired();

            // leaf = keccak256(invoiceId, classId, chainId, token, tokenType=ERC20)
            bytes32 leaf = keccak256(abi.encode(a.invoiceId, a.classId, uint64(block.chainid), a.token, uint8(TokenType.ERC20)));
            if (leaf != leafHashes[i]) revert LeafMismatch();
            leaves[i] = leaf;
        }
        bool ok = MerkleProof.multiProofVerify(root, leaves, multiProof, proofFlags);
        if (!ok) revert MultiproofFailed();

        // 3) 統計每個 token 的總推入量（本批）
        //    並統計每個 class 的總量（用於 Mirror cap 扣額）
        //   （使用小陣列 O(n^2) 聚合，n 很小；正式版可換成映射+暫存）
        address[] memory tokenKeys = new address[](actions.length);
        uint256[] memory tokenSums = new uint256[](actions.length);
        uint256 tk = 0;

        bytes32[] memory classKeys = new bytes32[](actions.length);
        uint128[] memory classSums = new uint128[](actions.length);
        uint256 ck = 0;

        for (uint256 i = 0; i < actions.length; i++) {
            ActionRef calldata a = actions[i];

            // token 聚合
            bool hitT = false;
            for (uint256 t = 0; t < tk; t++) if (tokenKeys[t] == a.token) { tokenSums[t] += a.amount; hitT = true; break; }
            if (!hitT) { tokenKeys[tk] = a.token; tokenSums[tk] = a.amount; tk++; }

            // class 聚合
            bool hitC = false;
            for (uint256 c = 0; c < ck; c++) if (classKeys[c] == a.classId) { classSums[c] += uint128(a.amount); hitC = true; break; }
            if (!hitC) { classKeys[ck] = a.classId; classSums[ck] = uint128(a.amount); ck++; }
        }

        // 4) 用餘額差帳本驗證「確有足夠新推入資產」
        for (uint256 t = 0; t < tk; t++) {
            address token = tokenKeys[t];
            uint256 expected = tokenSums[t];
            uint256 bal = IERC20(token).balanceOf(address(this));
            uint256 accounted = tokenAccountedTotal[token];
            uint256 available = bal - accounted;
            if (available < expected) revert InsufficientPushed();
        }

        // 5) 對每個 class 先扣 Mirror cap（避免之後回滾複雜，可逐個扣）
        for (uint256 c = 0; c < ck; c++) {
            sessionMirror.checkAndConsume(sessionId, classKeys[c], classSums[c]);
        }

        // 6) 記帳：增加 per-invoice/per-payer/per-token，並增加 tokenAccountedTotal
        for (uint256 i = 0; i < actions.length; i++) {
            ActionRef calldata a = actions[i];
            erc20LockedByPayer[a.invoiceId][a.token][a.payer] += a.amount;
            erc20TotalLocked[a.invoiceId][a.token]           += a.amount;
            tokenAccountedTotal[a.token]                     += a.amount;
            emit Locked(a.invoiceId, a.classId, a.payer, a.token, a.amount);
        }

        // 7) 彙總 per class → 回報 Hub
        LockedClassDelta[] memory deltas = new LockedClassDelta[](ck);
        for (uint256 c = 0; c < ck; c++) {
            deltas[c] = LockedClassDelta({ classId: classKeys[c], delta: classSums[c] });
        }
        bytes memory payload = abi.encode(LockedClassBatchMsg({
            invoiceId: invoiceId,
            srcChainId: uint64(block.chainid),
            deltas: deltas,
            leafHashes: leaves,       // 供 Hub（如啟用）二次驗證
            multiProof: multiProof,
            proofFlags: proofFlags
        }));
        bytes memory dstPath = trustedRemote[hubLzChainId];
        _lzSend(hubLzChainId, dstPath, payload, "");
    }

    // -------- Claim / Refund --------
    function claimErc20(bytes32 invoiceId, address token, uint256 amount, address to) external nonReentrant {
        require(releasableInvoice[invoiceId], "NotReleasable");
        address rcpt = (to == address(0)) ? msg.sender : to;
        uint256 bal = erc20TotalLocked[invoiceId][token];
        require(bal >= amount, "exceed");
        erc20TotalLocked[invoiceId][token] = bal - amount;
        IERC20(token).transfer(rcpt, amount);
        emit Released(invoiceId, rcpt, token, amount);
    }

    function claimRefundErc20(bytes32 invoiceId, address token, address to) external nonReentrant {
        require(refundableInvoice[invoiceId], "NotRefundable");
        uint256 amt = erc20LockedByPayer[invoiceId][token][msg.sender];
        require(amt > 0, "no refund");
        erc20LockedByPayer[invoiceId][token][msg.sender] = 0;
        erc20TotalLocked[invoiceId][token] -= amt;
        IERC20(token).transfer(to == address(0) ? msg.sender : to, amt);
        emit Refunded(invoiceId, to == address(0) ? msg.sender : to, token, amt);
    }
}
