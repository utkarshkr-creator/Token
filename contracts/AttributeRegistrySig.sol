// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18; // Or your project's version >= 0.8.0

// Interface for the Groth16 Verifier generated for ProveCommitmentWithSignature.circom
// Expects 4 public inputs: [commitmentHash, issuerAx, issuerAy, messageHash]
interface IGroth16VerifierSigned {
    function verifyProof(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[4] memory input // [commitmentHash, issuerAx, issuerAy, messageHash]
    ) external view returns (bool);
}

/**
 * @title AttributeRegistrySig
 * @dev Stores attribute claims (commitment hashes) linked to users, attribute names,
 *      and issuer EdDSA public key coordinates.
 *      Requires a ZK-SNARK proof (verifying knowledge of attribute secrets AND
 *      a valid EdDSA signature from the issuer) to add a claim.
 *      This version stores issuer Ax/Ay directly due to uint256 range limitations.
 */
contract AttributeRegistrySig {

    // --- State Variables ---
    IGroth16VerifierSigned public immutable zkVerifier; // Address of the deployed Groth16 Verifier

    /**
     * @dev Represents a stored claim.
     * issuerAx and issuerAy are the coordinates of the issuer's EdDSA public key
     * that was verified within the ZK proof during the addClaim call.
     */
    struct Claim {
        bytes32 attributeNameHash; // keccak256(attributeName)
        uint256 issuerAx;          // Issuer's EdDSA Public Key X coord (stored directly)
        uint256 issuerAy;          // Issuer's EdDSA Public Key Y coord (stored directly)
        uint256 commitmentHash;    // H(attributeValue, salt) verified by ZK proof
        bool exists;
    }

    // Mapping: user address => mapping attributeNameHash => Claim struct
    // Stores the claims associated with each user for specific attributes.
    mapping(address => mapping(bytes32 => Claim)) public userClaims;

    // --- Events ---
    /**
     * @dev Emitted when a claim is successfully added via a valid ZK proof.
     * @param user The address adding the claim (msg.sender).
     * @param attributeNameHash keccak256 hash of the attribute name.
     * @param issuerAx The X-coordinate of the issuer's EdDSA public key from the verified proof.
     * @param issuerAy The Y-coordinate of the issuer's EdDSA public key from the verified proof.
     * @param commitmentHash The Poseidon commitment hash H(value, salt) linked to the proof.
     */
    event ClaimAdded(
        address indexed user,
        bytes32 indexed attributeNameHash,
        uint256 issuerAx, // Emitting Ax/Ay directly
        uint256 issuerAy,
        uint256 commitmentHash
    );

    // --- Errors ---
    error ZkProofVerificationFailed();
    error ClaimAlreadyExists();

    // --- Constructor ---
    /**
     * @dev Sets the immutable address of the ZK verifier contract.
     * @param _zkVerifierAddress Address of the deployed VerifierSig.sol contract.
     */
    constructor(address _zkVerifierAddress) {
        require(_zkVerifierAddress != address(0), "Verifier address cannot be zero");
        zkVerifier = IGroth16VerifierSigned(_zkVerifierAddress);
    }

    // --- Add Claim Function ---
    /**
     * @dev Adds a claim for the caller (msg.sender).
     *      Requires and verifies a ZK-SNARK proof demonstrating knowledge of the
     *      secrets behind '_commitmentHash' AND validity of an EdDSA signature
     *      from '_issuerAx'/'_issuerAy' over '_messageHash'.
     * @param _attributeName The plain text name of the attribute (e.g., "age").
     * @param _issuerAx The issuer's EdDSA Public Key X coordinate (passed as public input to proof).
     * @param _issuerAy The issuer's EdDSA Public Key Y coordinate (passed as public input to proof).
     * @param _messageHash The Poseidon Hash of the signed certificate data (passed as public input to proof).
     * @param _commitmentHash The Poseidon hash H(attributeValue, salt) (passed as public input to proof).
     * @param _a Groth16 proof component pi_a.
     * @param _b Groth16 proof component pi_b.
     * @param _c Groth16 proof component pi_c.
     */
    function addClaim(
        string calldata _attributeName,
        uint256 _issuerAx,       // Corresponds to public.json[1]
        uint256 _issuerAy,       // Corresponds to public.json[2]
        uint256 _messageHash,    // Corresponds to public.json[3]
        uint256 _commitmentHash, // Corresponds to public.json[0]
        uint256[2] calldata _a,
        uint256[2][2] calldata _b,
        uint256[2] calldata _c
    ) external {
        // 1. Prepare Public Inputs array for the ZK Verifier
        //    Order MUST match Circom main's public declaration:
        //    [commitmentHash, issuerAx, issuerAy, messageHash]
        uint256[4] memory publicInputs;
        publicInputs[0] = _commitmentHash;
        publicInputs[1] = _issuerAx;
        publicInputs[2] = _issuerAy;
        publicInputs[3] = _messageHash;

        // 2. Verify the ZK Proof using the deployed Verifier contract
        bool proofIsValid = zkVerifier.verifyProof(_a, _b, _c, publicInputs);
        // Use custom error for revert reason
        if (!proofIsValid) {
            revert ZkProofVerificationFailed();
        }

        // 3. Proof is valid: Prepare storage key (attribute name hash)
        bytes32 attributeNameHash = keccak256(abi.encodePacked(_attributeName));

        // 4. Check if a claim for this user and attribute already exists
        if (userClaims[msg.sender][attributeNameHash].exists) {
            revert ClaimAlreadyExists();
        }

        // 5. Store the new Claim Data
        //    Storing Ax/Ay directly instead of looking up an ETH address
        userClaims[msg.sender][attributeNameHash] = Claim({
            attributeNameHash: attributeNameHash,
            issuerAx: _issuerAx, // Store provided/verified Ax
            issuerAy: _issuerAy, // Store provided/verified Ay
            commitmentHash: _commitmentHash, // Store the verified hash
            exists: true
        });

        // 6. Emit Event containing the stored details
        emit ClaimAdded(
            msg.sender,
            attributeNameHash,
            _issuerAx,
            _issuerAy,
            _commitmentHash
        );
    }

    /**
     * @dev Retrieves the stored claim details for a user and attribute name.
     * @param _user The address of the user whose claim to retrieve.
     * @param _attributeName The plain text name of the attribute.
     * @return issuerAx The X-coordinate of the issuer's EdDSA public key.
     * @return issuerAy The Y-coordinate of the issuer's EdDSA public key.
     * @return commitmentHash The stored Poseidon commitment hash.
     * @return exists Boolean indicating if the claim was found.
     */
    function getClaim(address _user, string calldata _attributeName)
        external view
        returns (
            uint256 issuerAx,
            uint256 issuerAy,
            uint256 commitmentHash,
            bool exists
        )
    {
        bytes32 attributeNameHash = keccak256(abi.encodePacked(_attributeName));
        Claim storage claimData = userClaims[_user][attributeNameHash];
        // Return the stored values directly
        return (
            claimData.issuerAx,
            claimData.issuerAy,
            claimData.commitmentHash,
            claimData.exists
        );
    }
}