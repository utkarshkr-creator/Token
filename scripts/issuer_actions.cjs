#!/usr/bin/env node

// scripts/issuer_actions.cjs
// Generates EdDSA keys, defines certificate data, hashes it robustly,
// signs the hash, and saves parameters for the user.

// CommonJS imports
const { buildPoseidon, buildEddsa } = require('circomlibjs');
const { keccak256 } = require('ethers'); // Using ethers v6+ for keccak256
const fs = require('fs');
const path = require('path');
const { exit } = require('process');
const crypto = require('crypto'); // For RANDOM bytes generation (NOT secure for production keys)

// --- Configuration ---
const OUTPUT_DIR = 'issuer_output';
const PRIVATE_KEY_FILE = path.join(OUTPUT_DIR, 'issuer_private_key.hex');
const PUBLIC_KEY_FILE = path.join(OUTPUT_DIR, 'issuer_public_key.json');
const CERTIFICATE_DATA_FILE = path.join(OUTPUT_DIR, 'certificate_data.json');
const CERT_HASH_FILE = path.join(OUTPUT_DIR, 'certificate_poseidon_hash.txt'); // Final hash used
const SIGNATURE_FILE = path.join(OUTPUT_DIR, 'certificate_signature.json');
const PARAMS_FOR_USER_FILE = path.join(OUTPUT_DIR, 'params_for_user.json');

/**
 * Helper function to safely convert any field element to string
 */
function safeToString(value) {
    // First try direct toString (works for BigInt)
    try {
        return value.toString();
    } catch (e) {
        // If that fails, try accessing as array if possible
        if (value && typeof value === 'object' && value.length !== undefined) {
            return Array.from(value).join('');
        }
        // Last resort - return stringified
        return `${value}`;
    }
}

/**
 * Main function to simulate issuer actions.
 */
async function main() {
    console.log("[INFO] Starting Issuer Actions Simulation...");

    // --- 1. Ensure Output Directory Exists ---
    if (!fs.existsSync(OUTPUT_DIR)) {
        console.log(`[INFO] Creating output directory: ${OUTPUT_DIR}`);
        fs.mkdirSync(OUTPUT_DIR);
    } else {
        console.log(`[INFO] Using existing output directory: ${OUTPUT_DIR}`);
    }

    // --- 2. Initialize Circomlibjs Components ---
    console.log("[INFO] Initializing EdDSA and Poseidon...");
    let eddsa, poseidon;
    try {
        eddsa = await buildEddsa();
        poseidon = await buildPoseidon();
        console.log("[INFO] Circomlibjs components initialized.");
    } catch (error) {
        console.error("[ERROR] Failed to initialize circomlibjs components:", error.message);
        exit(1);
    }

    // --- 3. Generate Issuer EdDSA Keypair (Baby Jubjub) ---
    console.log("[INFO] Generating Issuer EdDSA Keypair...");
    const privateKeyBytes = crypto.randomBytes(32); // INSECURE FOR PRODUCTION
    fs.writeFileSync(PRIVATE_KEY_FILE, privateKeyBytes.toString('hex'));
    console.log(`  - Private Key saved (hex): ${PRIVATE_KEY_FILE}`);

    let publicKey; 
    let publicKeyJson;
    try {
        const rawPublicKey = eddsa.prv2pub(privateKeyBytes);
        publicKeyJson = {
            Ax: safeToString(rawPublicKey[0]),
            Ay: safeToString(rawPublicKey[1])
        };
        publicKey = rawPublicKey;
        fs.writeFileSync(PUBLIC_KEY_FILE, JSON.stringify(publicKeyJson, null, 2));
        console.log(`  - Public Key (Ax, Ay) saved: ${PUBLIC_KEY_FILE}`);
        console.log(`      Ax: ${publicKeyJson.Ax}`);
        console.log(`      Ay: ${publicKeyJson.Ay}`);
    } catch (error) {
         console.error("[ERROR] Failed to derive/save public key:", error.message);
         exit(1);
    }

    // --- 4. Define Example Certificate Data ---
    console.log("[INFO] Defining Certificate Data...");
    const certificateData = {
        subject: "did:example:user123",
        issuer: "did:example:trustedIssuerCorp",
        issuanceDate: new Date().toISOString(),
        type: "ProofOfAgeCredential",
        details: { age: 25, nationality: "ExampleLand" },
        context: "Example Credential for ZK Proof Demo"
    };
    const certString = JSON.stringify(certificateData, null, 2);
    fs.writeFileSync(CERTIFICATE_DATA_FILE, certString);
    console.log(`  - Certificate data saved: ${CERTIFICATE_DATA_FILE}`);

    // --- 5. Hash Certificate Data (Robust Method: Keccak -> Split -> Poseidon) ---
    console.log("[INFO] Hashing Certificate Data using Keccak256 -> Split(128b) -> Poseidon(2 inputs)...");
    let messageHashOutput; 
    let messageHashString;
    let messageHashBigInt;
    try {
        const messageBuffer = Buffer.from(certString, 'utf-8');

        // a. Keccak256 Hash
        const certKeccakHashHex = keccak256(messageBuffer);
        console.log(`  - Certificate Keccak256 Hash: ${certKeccakHashHex}`);

        // b. Split the 256-bit hash into two 128-bit chunks (as BigInts)
        const hashHexNoPrefix = certKeccakHashHex.slice(2);
        if (hashHexNoPrefix.length !== 64) {
             throw new Error(`Keccak hash has unexpected length: ${hashHexNoPrefix.length}`);
        }
        const chunk1Hex = hashHexNoPrefix.substring(0, 32);
        const chunk2Hex = hashHexNoPrefix.substring(32, 64);

        const chunk1BigInt = BigInt('0x' + chunk1Hex);
        const chunk2BigInt = BigInt('0x' + chunk2Hex);
        console.log(`     - Chunk1 (BigInt): ${chunk1BigInt.toString().substring(0, 10)}...`);
        console.log(`     - Chunk2 (BigInt): ${chunk2BigInt.toString().substring(0, 10)}...`);

        // c. Hash the TWO chunks using Poseidon
        if (!poseidon || typeof poseidon !== 'function') {
             throw new Error("Poseidon function is not available.");
        }
        messageHashBigInt = poseidon([chunk1BigInt, chunk2BigInt]);
        messageHashString = safeToString(messageHashBigInt);

        fs.writeFileSync(CERT_HASH_FILE, messageHashString);
        console.log(`  - Final Poseidon Hash (M) of Chunks saved: ${CERT_HASH_FILE}`);
        console.log(`      Hash (M): ${messageHashString}`);

    } catch (error) {
         console.error("[ERROR] Failed during robust message hashing:", error.message);
         if (error.stack) console.error(error.stack);
         exit(1);
    }

    // --- 6. Sign the Final Certificate Hash (EdDSA) ---
    console.log("[INFO] Signing the *final* Poseidon Hash (M) using EdDSA...");
    let signature; 
    try {
        if (!eddsa || typeof eddsa.signPoseidon !== 'function') {
            throw new Error("EdDSA sign function not available.");
        }
        signature = eddsa.signPoseidon(privateKeyBytes, messageHashBigInt);
        console.log("[INFO] EdDSA signing successful.");
    } catch (error) {
         console.error("[ERROR] Failed during EdDSA signing:", error.message);
         if (error.stack) console.error(error.stack);
         exit(1);
    }

    // --- 7. Format and Save Signature Components ---
    console.log("[INFO] Formatting and saving signature...");
    let signatureJson;
    try {
        // Use safe string conversion for all signature components
        signatureJson = {
            R8x: safeToString(signature.R8[0]),
            R8y: safeToString(signature.R8[1]),
            S:   safeToString(signature.S)
        };
        fs.writeFileSync(SIGNATURE_FILE, JSON.stringify(signatureJson, null, 2));
        console.log(`  - Signature (R8x, R8y, S) saved: ${SIGNATURE_FILE}`);
        console.log(`      R8x: ${signatureJson.R8x}`);
        console.log(`      R8y: ${signatureJson.R8y}`);
        console.log(`      S: ${signatureJson.S}`);
    } catch (error) {
        console.error("[ERROR] Failed to format or save signature components:", error.message);
        if (error.stack) console.error(error.stack);
        exit(1);
    }

    // --- 8. Prepare Parameters for User ---
    console.log("[INFO] Preparing parameters package for the user...");
    const paramsForUser = {
        issuerAx: publicKeyJson.Ax,
        issuerAy: publicKeyJson.Ay,
        messageHash: messageHashString,
        signature_R8x: signatureJson.R8x,
        signature_R8y: signatureJson.R8y,
        signature_S: signatureJson.S,
        attributeValueFromCert: certificateData.details.age
    };
    fs.writeFileSync(PARAMS_FOR_USER_FILE, JSON.stringify(paramsForUser, null, 2));
    console.log(`  - Parameters for User saved: ${PARAMS_FOR_USER_FILE}`);

    // --- Completion ---
    console.log("\n[SUCCESS] Issuer actions simulation complete.");
    console.log(`[INFO] Key files, signature, and user parameters are in the '${OUTPUT_DIR}' directory.`);
    console.log(`[NEXT STEP] Provide the '${PARAMS_FOR_USER_FILE}' file to the user.`);
    console.log("[WARNING] The generated private key is insecure and for testing only.");
}

// --- Execute Main Function ---
main().catch((error) => {
    console.error("\n[FATAL ERROR] An unexpected error occurred in issuer_actions:");
    console.error(error);
    exit(1);
});