// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

// === 外掛：OpenZeppelin（Remix 可直接引用） ===
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// === 簡化版 LayerZero v1 端點介面與收發檢核 ===
interface ILayerZeroEndpoint {
    function send(
        uint16 _dstChainId, bytes calldata _destination, bytes calldata _payload,
        address payable _refundAddress, address _zroPaymentAddress, bytes calldata _adapterParams
    ) external payable;
}

abstract contract LzAppLite is Ownable {
    ILayerZeroEndpoint public lzEndpoint;
    // LZ srcChainId => trusted remote (bytes-encoded address path)
    mapping(uint16 => bytes) public trustedRemote;

    constructor(address _endpoint) { lzEndpoint = ILayerZeroEndpoint(_endpoint); }

    modifier onlyLzEndpoint() {
        require(msg.sender == address(lzEndpoint), "NotLZEndpoint");
        _;
    }
    function setTrustedRemote(uint16 srcChainId, bytes calldata remote) external onlyOwner {
        trustedRemote[srcChainId] = remote;
    }
    function _isTrusted(uint16 srcChainId, bytes calldata srcAddr) internal view returns (bool) {
        return keccak256(trustedRemote[srcChainId]) == keccak256(srcAddr);
    }
    // 子合約需實作：lzReceive(...)
    function _lzSend(uint16 dstChainId, bytes memory dst, bytes memory payload, bytes memory adapterParams) internal {
        lzEndpoint.send(dstChainId, dst, payload, payable(msg.sender), address(0), adapterParams);
    }
}

// === 業務型別 ===
enum TokenType { ERC20, ERC721, ERC1155, ERC3643_ERC20 }

struct AssetClass {
    bytes32 classId;      // e.g., keccak256("USDT-EQUIV"), keccak256("APPLE-3643")
    uint128 minTotal;     // ERC20/3643: 最小單位；721：件數；1155：數量
    bool    allowOverpay;
}

struct PolicyV2 {
    address  payee;             // 收方
    uint64   deadline;          // UNIX 秒
    AssetClass[] classes;       // 僅存門檻
    bytes32  allowlistRoot;     // 允收清單（Multiproof）
    bool     hubReverify;       // Hub 端是否二次驗證 proof（更去信任）
}

// Vault -> Hub：同一批鎖款的「每類別累計」
struct LockedClassDelta {
    bytes32 classId;
    uint128 delta;
}

// Vault -> Hub：批次鎖款回報（可含 multiproof 讓 Hub 二次驗證）
struct LockedClassBatchMsg {
    bytes32 invoiceId;
    uint64  srcChainId;           // EVM chainId（僅做紀錄）
    LockedClassDelta[] deltas;    // 各類別累計
    // Hub 二次驗證（選配）
    bytes32[] leafHashes;
    bytes32[] multiProof;
    bool[]    proofFlags;
}

// Hub -> Vault 指令
enum HubMsgType { POLICY_SYNC, RELEASE, REFUND }

struct PolicySyncMsg {
    bytes32 invoiceId;
    bytes32 allowlistRoot;
    uint64  deadline;
    bytes32[] classIds; // 可選：幫 Vault 快取 class 白名單
}

struct HubCommand {
    HubMsgType t;
    bytes      data;     // abi.encode(PolicySyncMsg) 或 abi.encode(bytes32 invoiceId)
}

error NotPayee();
error PolicyExists();
error PolicyNotFound();
error DeadlinePassed();
error ClassUnknown();
error Overflow();
error AlreadySatisfied();
error AlreadyRefunded();
error NotTrustedRemote();

contract SettlementHub is LzAppLite {
    using MerkleProof for bytes32[];

    // === 儲存 ===
    mapping(bytes32 => PolicyV2) private _policies;                       // invoiceId -> policy
    mapping(bytes32 => mapping(bytes32 => uint128)) public classAccum;    // invoiceId -> classId -> 累計
    mapping(bytes32 => bool) public satisfied;                            // 是否達標
    mapping(bytes32 => bool) public refunded;                             // 是否退款完成
    // EVM chainId -> Vault 地址（供前端與管理）
    mapping(uint64 => address) public vaultOfChain;

    // （可選）finality 設定（僅作紀錄用途）
    mapping(uint64 => uint8) public finalityConfs;

    // === 事件 ===
    event PolicySet(bytes32 indexed invoiceId, address indexed payee, bytes32 allowlistRoot, uint64 deadline, bool hubReverify);
    event LockCounted(bytes32 indexed invoiceId, bytes32 indexed classId, uint128 delta, uint64 srcChainId);
    event Satisfied(bytes32 indexed invoiceId);
    event Refunded(bytes32 indexed invoiceId);
    event ReleaseSent(bytes32 indexed invoiceId, uint16 indexed dstLzChainId);
    event RefundSent(bytes32 indexed invoiceId, uint16 indexed dstLzChainId);
    event PolicySynced(bytes32 indexed invoiceId, uint16 indexed dstLzChainId);

    constructor(address _lzEndpoint) LzAppLite(_lzEndpoint) {}

    // === 管理 ===
    function registerVault(uint64 evmChainId, address vault) external onlyOwner {
        vaultOfChain[evmChainId] = vault;
    }
    function setFinality(uint64 evmChainId, uint8 confs) external onlyOwner {
        finalityConfs[evmChainId] = confs;
    }

    // === 收方上傳門檻與允收清單 root ===
    function setPolicyV2(bytes32 invoiceId, PolicyV2 calldata p) external {
        if (_policies[invoiceId].payee != address(0)) revert PolicyExists();
        if (p.payee == address(0)) revert NotPayee();
        _policies[invoiceId].payee       = p.payee;
        _policies[invoiceId].deadline    = p.deadline;
        _policies[invoiceId].allowlistRoot = p.allowlistRoot;
        _policies[invoiceId].hubReverify = p.hubReverify;
        // 存 classes（動態陣列）
        uint256 n = p.classes.length;
        _policies[invoiceId].classes = new AssetClass[](n);
        for (uint256 i=0;i<n;i++){ _policies[invoiceId].classes[i] = p.classes[i]; }

        emit PolicySet(invoiceId, p.payee, p.allowlistRoot, p.deadline, p.hubReverify);
    }

    function getPolicyV2(bytes32 invoiceId) external view returns (PolicyV2 memory) {
        if (_policies[invoiceId].payee == address(0)) revert PolicyNotFound();
        return _policies[invoiceId];
    }

    // === LZ 接收：各鏈 Vault 的鎖款回報（可含 multiproof）===
    function lzReceive(uint16 srcLzChainId, bytes calldata srcAddr, uint64 /*nonce*/, bytes calldata payload)
        public
        override
        onlyLzEndpoint
    {
        if (!_isTrusted(srcLzChainId, srcAddr)) revert NotTrustedRemote();

        LockedClassBatchMsg memory m = abi.decode(payload, (LockedClassBatchMsg));
        PolicyV2 storage pol = _policies[m.invoiceId];
        if (pol.payee == address(0)) revert PolicyNotFound();
        if (block.timestamp > pol.deadline) revert DeadlinePassed();

        // （選配）Hub 端二次 multiproof 驗證
        if (pol.hubReverify) {
            // 若你希望逐筆檢核葉內容，可把 leaf 資料（invoiceId,classId,chainId,token,tokenType）包進 payload；
            // 此處假設 leafHashes 已由 Vault 依相同規則產生
            bool ok = MerkleProof.multiProofVerify(pol.allowlistRoot, m.leafHashes, m.multiProof, m.proofFlags);
            require(ok, "Hub multiproof failed");
        }

        // 累計各類別
        for (uint256 i=0;i<m.deltas.length;i++){
            (bytes32 cid, uint128 d) = (m.deltas[i].classId, m.deltas[i].delta);
            // （可選）確認 classId 存在於 policy
            bool found=false;
            for (uint256 k=0;k<pol.classes.length;k++){
                if (pol.classes[k].classId == cid){found=true;break;}
            }
            if(!found) revert ClassUnknown();

            uint128 prev = classAccum[m.invoiceId][cid];
            uint256 sum  = uint256(prev) + uint256(d);
            if (sum > type(uint128).max) revert Overflow();
            classAccum[m.invoiceId][cid] = uint128(sum);

            emit LockCounted(m.invoiceId, cid, d, 0 /*可紀錄 src EVM chainId */);
        }

        // 判定是否達標
        if (!satisfied[m.invoiceId]) {
            bool allMet = true;
            for (uint256 k=0;k<pol.classes.length;k++){
                AssetClass memory ac = pol.classes[k];
                if (classAccum[m.invoiceId][ac.classId] < ac.minTotal) { allMet=false; break; }
            }
            if (allMet) {
                satisfied[m.invoiceId] = true;
                emit Satisfied(m.invoiceId);
            }
        }
    }

    // === 廣播放款 / 退款（Hub -> 各鏈 Vault） ===
    function broadcastRelease(bytes32 invoiceId, uint16[] calldata dstLzChainIds, bytes[] calldata dstPaths, bytes[] calldata adapterParams) external {
        require(satisfied[invoiceId], "Not satisfied");
        for (uint256 i=0;i<dstLzChainIds.length;i++){
            bytes memory payload = abi.encode(HubCommand({ t: HubMsgType.RELEASE, data: abi.encode(invoiceId) }));
            _lzSend(dstLzChainIds[i], dstPaths[i], payload, adapterParams[i]);
            emit ReleaseSent(invoiceId, dstLzChainIds[i]);
        }
    }

    function broadcastRefund(bytes32 invoiceId, uint16[] calldata dstLzChainIds, bytes[] calldata dstPaths, bytes[] calldata adapterParams) external {
        if (satisfied[invoiceId]) revert AlreadySatisfied();
        PolicyV2 storage pol = _policies[invoiceId];
        if (block.timestamp <= pol.deadline) revert DeadlinePassed();
        if (refunded[invoiceId]) revert AlreadyRefunded();
        refunded[invoiceId] = true;

        for (uint256 i=0;i<dstLzChainIds.length;i++){
            bytes memory payload = abi.encode(HubCommand({ t: HubMsgType.REFUND, data: abi.encode(invoiceId) }));
            _lzSend(dstLzChainIds[i], dstPaths[i], payload, adapterParams[i]);
            emit RefundSent(invoiceId, dstLzChainIds[i]);
        }
        emit Refunded(invoiceId);
    }

    // （可選）同步 Policy 給各鏈 Vault 快取（UX 較佳）
    function broadcastSyncPolicy(bytes32 invoiceId, uint16[] calldata dstLzChainIds, bytes[] calldata dstPaths, bytes[] calldata adapterParams) external {
        PolicyV2 storage pol = _policies[invoiceId];
        if (pol.payee == address(0)) revert PolicyNotFound();

        bytes32[] memory classIds = new bytes32[](pol.classes.length);
        for (uint256 i=0;i<pol.classes.length;i++){ classIds[i]=pol.classes[i].classId; }

        PolicySyncMsg memory s = PolicySyncMsg({
            invoiceId: invoiceId,
            allowlistRoot: pol.allowlistRoot,
            deadline: pol.deadline,
            classIds: classIds
        });

        bytes memory payload = abi.encode(HubCommand({ t: HubMsgType.POLICY_SYNC, data: abi.encode(s) }));
        for (uint256 i=0;i<dstLzChainIds.length;i++){
            _lzSend(dstLzChainIds[i], dstPaths[i], payload, adapterParams[i]);
            emit PolicySynced(invoiceId, dstLzChainIds[i]);
        }
    }
}
