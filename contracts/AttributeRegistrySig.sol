// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

// Interface for the Groth16 Verifier generated for ProveCommitmentWithSignature.circom
// Expects 4 public inputs: [commitmentHash, issuerAx, issuerAy, messageHash]
interface IGroth16VerifierSigned {
    function verifyProof(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[4] memory input // Updated size
    ) external view returns (bool);
}

contract AttributeRegistrySig {

    // --- State Variables ---
    IGroth16VerifierSigned public immutable zkVerifier; // Verifier for ProveCommitmentWithSignature

    struct Claim {
        bytes32 attributeNameHash; // keccak256(attributeName)
        address issuerEthAddress; // Associated Ethereum address of the issuer
        uint256 commitmentHash;   // H(attributeValue, salt) verified by ZK proof
        // Optional: Store EdDSA details if needed later, adds storage cost
        // uint256 issuerAx;
        // uint256 issuerAy;
        // uint256 messageHash;
        bool exists;
    }

    // Mapping user address => mapping attributeNameHash => Claim
    mapping(address => mapping(bytes32 => Claim)) public userClaims;

    // Optional: Mapping issuer EdDSA public key hash to their ETH address for lookup
    // bytes32(keccak256(abi.encodePacked(Ax, Ay))) => ethAddress
    mapping(bytes32 => address) public issuerPublicKeyToAddress;


    // --- Events ---
    event ClaimAdded(
        address indexed user,
        bytes32 indexed attributeNameHash,
        address indexed issuerEthAddress, // Store ETH addr
        uint256 commitmentHash
        // Optional: Add EdDSA details here if useful
    );

    event IssuerRegistered(
        address indexed issuerEthAddress,
        uint256 issuerAx,
        uint256 issuerAy
    );

    // --- Constructor ---
    constructor(address _zkVerifierAddress) {
        require(_zkVerifierAddress != address(0), "Verifier address cannot be zero");
        zkVerifier = IGroth16VerifierSigned(_zkVerifierAddress);
    }

    // --- Optional: Issuer Registration ---
    /**
     * @dev Allows associating an EdDSA public key with an Ethereum address.
     *      Needed if the contract must validate the issuer *within* addClaim.
     *      Requires access control (e.g., onlyAdmin).
     */
    function registerIssuer(address _issuerEthAddress, uint256 _issuerAx, uint256 _issuerAy) external {
        // Add Access Control (e.g., onlyOwner)
        bytes32 pubKeyHash = keccak256(abi.encodePacked(_issuerAx, _issuerAy));
        require(issuerPublicKeyToAddress[pubKeyHash] == address(0), "Issuer PK already registered");
        issuerPublicKeyToAddress[pubKeyHash] = _issuerEthAddress;
        emit IssuerRegistered(_issuerEthAddress, _issuerAx, _issuerAy);
    }


    // --- Add Claim Function ---
    /**
     * @dev Adds a claim after verifying ZK proof (incl EdDSA signature check).
     * @param _attributeName Name of the attribute.
     * @param _issuerAx Issuer's EdDSA Public Key X coord (must match proof input).
     * @param _issuerAy Issuer's EdDSA Public Key Y coord (must match proof input).
     * @param _messageHash Poseidon Hash of signed cert data (must match proof input).
     * @param _commitmentHash Poseidon hash H(attributeValue, salt) (must match proof input).
     * @param _a Proof component pi_a.
     * @param _b Proof component pi_b.
     * @param _c Proof component pi_c.
     */
    function addClaim(
        string calldata _attributeName,
        uint256 _issuerAx,       // Passed directly, used in proof verification
        uint256 _issuerAy,       // Passed directly, used in proof verification
        uint256 _messageHash,    // Passed directly, used in proof verification
        uint256 _commitmentHash, // Passed directly, used in proof verification & stored
        uint256[2] calldata _a,
        uint256[2][2] calldata _b,
        uint256[2] calldata _c
    ) external {

        // 1. Optional: Check if issuer public key is known/registered
        bytes32 pubKeyHash = keccak256(abi.encodePacked(_issuerAx, _issuerAy));
        address issuerEthAddress = issuerPublicKeyToAddress[pubKeyHash];
        require(issuerEthAddress != address(0), "AttributeRegistry: Issuer public key not registered");

        // 2. Prepare Public Inputs for ZK Verifier
        //    Order MUST match Circom main public: [commitmentHash, issuerAx, issuerAy, messageHash]
        uint256[4] memory publicInputs;
        publicInputs[0] = _commitmentHash;
        publicInputs[1] = _issuerAx;
        publicInputs[2] = _issuerAy;
        publicInputs[3] = _messageHash;

        // 3. Verify the ZK Proof (includes embedded EdDSA check)
        bool proofIsValid = zkVerifier.verifyProof(_a, _b, _c, publicInputs);
        require(proofIsValid, "AttributeRegistry: ZK proof verification failed");

        // 4. Proof is valid - store the claim associated with the verified commitment hash.
        bytes32 attributeNameHash = keccak256(abi.encodePacked(_attributeName));

        // Check if claim already exists for this user/attribute
        require(
            !userClaims[msg.sender][attributeNameHash].exists,
            "AttributeRegistry: Claim already exists"
        );

        // Store the Claim Data (link attribute to verified commitment and issuer)
        userClaims[msg.sender][attributeNameHash] = Claim({
            attributeNameHash: attributeNameHash,
            issuerEthAddress: issuerEthAddress, // Store the looked-up ETH address
            commitmentHash: _commitmentHash,    // Store the verified hash
            exists: true
            // Optional: Store _issuerAx, _issuerAy, _messageHash if needed
        });

        // Emit Event
        emit ClaimAdded(msg.sender, attributeNameHash, issuerEthAddress, _commitmentHash);
    }

     // Function to get a claim - might return issuerEthAddress now
     function getClaim(address _user, string calldata _attributeName)
        external view
        returns (address issuerEthAddress, uint256 commitmentHash, bool exists)
    {
        bytes32 attributeNameHash = keccak256(abi.encodePacked(_attributeName));
        Claim storage claimData = userClaims[_user][attributeNameHash];
        return (claimData.issuerEthAddress, claimData.commitmentHash, claimData.exists);
    }
}
