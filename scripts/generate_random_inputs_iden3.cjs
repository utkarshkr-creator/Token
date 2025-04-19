#!/usr/bin/env node

// scripts/generate_random_inputs_iden3.cjs
// Using CommonJS format to avoid JSON import assertion issues

const { poseidon, eddsa } = require("@iden3/js-crypto");
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// --- Configuration ---
const OUTPUT_DIR = 'build';
const OUTPUT_FILENAME = path.join(OUTPUT_DIR, 'input.json');

// --- Helper: Get Random Field Element ---
function getRandomFieldElement() {
    const fieldPrime_Fp = BigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617");
    let randomBigInt;
    do {
        const randomBytes = crypto.randomBytes(32);
        randomBigInt = BigInt('0x' + randomBytes.toString('hex'));
    } while (randomBigInt >= fieldPrime_Fp);
    return randomBigInt;
}

// --- Main Logic ---
async function main() {
    console.log("[NodeScript] Generating RANDOM inputs using @iden3/js-crypto...");

    try {
        // --- 1. Generate Random Attribute and Salt ---
        const attributeValueBigInt = BigInt(Math.floor(Math.random() * 80) + 18);
        const saltBigInt = getRandomFieldElement();
        console.log(`  - Generated Attribute (Age): ${attributeValueBigInt}`);
        console.log(`  - Generated Salt (BigInt): ${saltBigInt.toString().substring(0,15)}...`);

        // --- 2. Calculate Commitment Hash using poseidon ---
        const commitmentHash = poseidon.hash([attributeValueBigInt, saltBigInt]);
        console.log(`  - Calculated Commitment Hash: ${commitmentHash.toString().substring(0,15)}...`);

        // --- 3. Generate Random EdDSA Keypair ---
        const privateKey = Buffer.from(crypto.randomBytes(32));
        const publicKey = eddsa.prv2pub(privateKey);
        const issuerAxBigInt = publicKey[0];
        const issuerAyBigInt = publicKey[1];
        console.log(`  - Generated Issuer Ax: ${issuerAxBigInt.toString().substring(0,15)}...`);
        console.log(`  - Generated Issuer Ay: ${issuerAyBigInt.toString().substring(0,15)}...`);

        // --- 4. Generate Message Hash ---
        const messageHashBigInt = poseidon.hash([getRandomFieldElement()]);
        console.log(`  - Generated Message Hash: ${messageHashBigInt.toString().substring(0,15)}...`);

        // --- 5. Generate EdDSA Signature ---
        const signature = eddsa.signPoseidon(privateKey, messageHashBigInt);
        const sigR8xBigInt = signature.R8[0];
        const sigR8yBigInt = signature.R8[1];
        const sigSBigInt = signature.S;
        console.log(`  - Generated Sig R8x: ${sigR8xBigInt.toString().substring(0,15)}...`);
        console.log(`  - Generated Sig R8y: ${sigR8yBigInt.toString().substring(0,15)}...`);
        console.log(`  - Generated Sig S: ${sigSBigInt.toString().substring(0,15)}...`);

        // --- 6. Verify the signature ---
        const isValid = eddsa.verifyPoseidon(messageHashBigInt, signature, publicKey);
        console.log(`  - Signature verification: ${isValid ? 'VALID ✓' : 'INVALID ✗'}`);

        // --- 7. Prepare inputData object ---
        const inputData = {
            attributeValue: attributeValueBigInt.toString(),
            salt: saltBigInt.toString(),
            signature_R8x: sigR8xBigInt.toString(),
            signature_R8y: sigR8yBigInt.toString(),
            signature_S: sigSBigInt.toString(),
            commitmentHash: commitmentHash.toString(),
            issuerAx: issuerAxBigInt.toString(),
            issuerAy: issuerAyBigInt.toString(),
            messageHash: messageHashBigInt.toString()
        };

        // --- 8. Write input.json file ---
        if (!fs.existsSync(OUTPUT_DIR)) {
            fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        }
        fs.writeFileSync(OUTPUT_FILENAME, JSON.stringify(inputData, null, 2));
        console.log(`\n[SUCCESS] Generated RANDOM Circom input file: ${OUTPUT_FILENAME}`);

    } catch (error) {
        console.error("\n[NodeScript ERROR] Failed during random input generation:", error.message);
        if (error.stack) console.error(error.stack);
        process.exit(1);
    }
}

// --- Execute Main Function ---
main().catch(err => {
    console.error(err);
    process.exit(1);
});