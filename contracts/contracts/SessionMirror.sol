// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "@openzeppelin/contracts/access/Ownable.sol";

// ---- Minimal LZ base (same as Hub) ----
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
    modifier onlyLzEndpoint() { require(msg.sender == address(lzEndpoint),"NotLZEndpoint"); _; }
    function setTrustedRemote(uint16 srcLzChainId, bytes calldata remote) external onlyOwner { trustedRemote[srcLzChainId] = remote; }
    function _isTrusted(uint16 srcLzChainId, bytes calldata srcAddr) internal view returns (bool) { return keccak256(trustedRemote[srcLzChainId]) == keccak256(srcAddr); }
    function _lzSend(uint16 dstChainId, bytes memory dst, bytes memory payload, bytes memory adapterParams) internal {
        lzEndpoint.send(dstChainId, dst, payload, payable(msg.sender), address(0), adapterParams);
    }
}

// ------ Shared types with Hub ------
enum HubMsgType { POLICY_SYNC, SESSION_SYNC, RELEASE, REFUND }
struct SessionSyncMsg {
    bytes32 sessionId;
    bytes32 invoiceId;
    address payer;
    address payee;
    bytes32 allowlistRoot;
    uint64  deadline;
    bytes32 planHash;
    bytes32[] classIds;
    uint128[] caps;
}
struct HubCommand { HubMsgType t; bytes data; }

// ------ Mirror ------
error NotHub();
error SessionExpired();
error CapExceeded();
error BadLengths();

contract SessionMirror is LzAppLite {
    struct SessionState {
        bytes32 invoiceId;
        address payer;
        address payee;
        bytes32 allowlistRoot;
        uint64  deadline;
        bytes32 planHash;
        mapping(bytes32 => uint128) cap;   // classId => cap
        mapping(bytes32 => uint128) spent; // classId => used
        bool    exists;
    }

    mapping(bytes32 => SessionState) private _sessions;

    event SessionSynced(bytes32 indexed sessionId, bytes32 indexed invoiceId, address payer, uint64 deadline);
    event Consumed(bytes32 indexed sessionId, bytes32 indexed classId, uint128 newSpent, uint128 cap);

    constructor(address _lzEndpoint) LzAppLite(_lzEndpoint) {}

    // Hub -> Mirror
    function lzReceive(uint16 srcLzChainId, bytes calldata srcAddr, uint64 /*nonce*/, bytes calldata payload)
        public
        onlyLzEndpoint
    {
        require(_isTrusted(srcLzChainId, srcAddr), "NotHub");
        HubCommand memory cmd = abi.decode(payload, (HubCommand));
        if (cmd.t == HubMsgType.SESSION_SYNC) {
            SessionSyncMsg memory m = abi.decode(cmd.data, (SessionSyncMsg));
            _syncSession(m);
        }
        // POLICY_SYNC/RELEASE/REFUND 由 Vault 接；Mirror 僅處理 SESSION_SYNC
    }

    function _syncSession(SessionSyncMsg memory m) internal {
        if (m.classIds.length != m.caps.length) revert BadLengths();
        SessionState storage s = _sessions[m.sessionId];
        s.invoiceId      = m.invoiceId;
        s.payer          = m.payer;
        s.payee          = m.payee;
        s.allowlistRoot  = m.allowlistRoot;
        s.deadline       = m.deadline;
        s.planHash       = m.planHash;
        s.exists         = true;
        for (uint256 i = 0; i < m.classIds.length; i++) {
            s.cap[m.classIds[i]] = m.caps[i];
            // spent 初值 0
        }
        emit SessionSynced(m.sessionId, m.invoiceId, m.payer, m.deadline);
    }

    // Vault 在鎖款前呼叫：檢核期限與 cap，並扣額
    function checkAndConsume(bytes32 sessionId, bytes32 classId, uint128 delta) external returns (bool) {
        SessionState storage s = _sessions[sessionId];
        require(s.exists, "NoSession");
        if (block.timestamp > s.deadline) revert SessionExpired();
        uint256 afterSpend = uint256(s.spent[classId]) + uint256(delta);
        if (afterSpend > s.cap[classId]) revert CapExceeded();
        s.spent[classId] = uint128(afterSpend);
        emit Consumed(sessionId, classId, s.spent[classId], s.cap[classId]);
        return true;
    }

    // 讀取（前端/監控用）
    function sessionMeta(bytes32 sessionId) external view returns (
        bytes32 invoiceId,
        address payer,
        address payee,
        bytes32 allowlistRoot,
        uint64  deadline,
        bytes32 planHash,
        bool    exists
    ) {
        SessionState storage s = _sessions[sessionId];
        return (s.invoiceId, s.payer, s.payee, s.allowlistRoot, s.deadline, s.planHash, s.exists);
    }

    function spentOf(bytes32 sessionId, bytes32 classId) external view returns (uint128) {
        return _sessions[sessionId].spent[classId];
    }
    function capOf(bytes32 sessionId, bytes32 classId) external view returns (uint128) {
        return _sessions[sessionId].cap[classId];
    }
}
