pragma circom 2.2.2;

include "circuits/poseidon.circom";
include "circuits/eddsa_poseidon.circom";

template ProveCommitmentWithSignature() {
    // === Private Inputs ===
    signal input attributeValue;
    signal input salt;

    // Signature components (provided by the user who holds the signed message)
    // These inputs are PRIVATE to the witness generation
    signal input signature_R8x;
    signal input signature_R8y;
    signal input signature_S;

    // === Public Inputs ===
    // These MUST match the order expected by the Solidity verifier and public.json
    signal input commitmentHash;    // User's attribute commitment hash
    signal input issuerAx;          // Issuer's Public Key X coordinate
    signal input issuerAy;          // Issuer's Public Key Y coordinate
    signal input messageHash;       // Hash of the certificate data that was signed

    // === Constraints ===

    // 1. Verify Poseidon Commitment: H(attributeValue, salt) == commitmentHash
    component commitHasher = Poseidon(2);
    commitHasher.inputs[0] <== attributeValue;
    commitHasher.inputs[1] <== salt;
    commitmentHash === commitHasher.out;

    // 2. Verify EdDSA Signature
    // Instantiate the EdDSA Poseidon Verifier component
    // Note: This component uses Poseidon internally for hashing during verification checks,
    // but it verifies a signature made over the externally provided `messageHash`.
    component sigVerifier = EdDSAPoseidonVerifier();

    // Connect inputs to the signature verifier component:
    sigVerifier.enabled <== 1;        // Enable the verification check
    sigVerifier.Ax <== issuerAx;      // Public Key coordinate Ax
    sigVerifier.Ay <== issuerAy;      // Public Key coordinate Ay
    sigVerifier.R8x <== signature_R8x; // Signature R point coordinate x (witness)
    sigVerifier.R8y <== signature_R8y; // Signature R point coordinate y (witness)
    sigVerifier.S <== signature_S;     // Signature scalar S (witness)
    sigVerifier.M <== messageHash;     // Hash of the signed message (public input)

    // The EdDSAPoseidonVerifier component includes internal assertions.
    // If the signature is invalid for the given public key and message hash,
    // the circuit constraints will not be satisfied, and proof generation will fail.
    // No explicit output needs checking here.
}

// --- Main Component ---
// Define the public inputs required by the external verifier (Solidity contract)
// The order MUST be consistent across setup, proof generation, and verification.
component main {public [commitmentHash, issuerAx, issuerAy, messageHash]} = ProveCommitmentWithSignature();
