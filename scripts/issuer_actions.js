#!/usr/bin/env node
"use strict";
// scripts/issuer_actions.js
// Generates EdDSA keys, defines certificate data, hashes it robustly,
// signs the hash, and saves parameters for the user.
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
// Imports
var circomlibjs_1 = require("circomlibjs");
var ethers_1 = require("ethers"); // Using ethers v6+ for keccak256
var fs_1 = require("fs");
var path_1 = require("path");
var process_1 = require("process");
var crypto_1 = require("crypto"); // For RANDOM bytes generation (NOT secure for production keys)
// --- Configuration ---
var OUTPUT_DIR = 'issuer_output';
var PRIVATE_KEY_FILE = path_1.default.join(OUTPUT_DIR, 'issuer_private_key.hex');
var PUBLIC_KEY_FILE = path_1.default.join(OUTPUT_DIR, 'issuer_public_key.json');
var CERTIFICATE_DATA_FILE = path_1.default.join(OUTPUT_DIR, 'certificate_data.json');
var CERT_HASH_FILE = path_1.default.join(OUTPUT_DIR, 'certificate_poseidon_hash.txt'); // Final hash used
var SIGNATURE_FILE = path_1.default.join(OUTPUT_DIR, 'certificate_signature.json');
var PARAMS_FOR_USER_FILE = path_1.default.join(OUTPUT_DIR, 'params_for_user.json');
/**
 * Main function to simulate issuer actions.
 */
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var eddsa, poseidon, error_1, privateKeyBytes, publicKey, publicKeyJson, F, rawPublicKey, certificateData, certString, messageHashOutput, messageHashString, messageHashBigInt, messageBuffer, certKeccakHashHex, hashHexNoPrefix, chunk1Hex, chunk2Hex, chunk1BigInt, chunk2BigInt, signature, signatureJson, paramsForUser;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("[INFO] Starting Issuer Actions Simulation...");
                    // --- 1. Ensure Output Directory Exists ---
                    if (!fs_1.default.existsSync(OUTPUT_DIR)) {
                        console.log("[INFO] Creating output directory: ".concat(OUTPUT_DIR));
                        fs_1.default.mkdirSync(OUTPUT_DIR);
                    }
                    else {
                        console.log("[INFO] Using existing output directory: ".concat(OUTPUT_DIR));
                    }
                    // --- 2. Initialize Circomlibjs Components ---
                    console.log("[INFO] Initializing EdDSA and Poseidon...");
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, (0, circomlibjs_1.buildEddsa)()];
                case 2:
                    eddsa = _a.sent();
                    return [4 /*yield*/, (0, circomlibjs_1.buildPoseidon)()];
                case 3:
                    poseidon = _a.sent();
                    console.log("[INFO] Circomlibjs components initialized.");
                    return [3 /*break*/, 5];
                case 4:
                    error_1 = _a.sent();
                    console.error("[ERROR] Failed to initialize circomlibjs components:", error_1.message);
                    (0, process_1.exit)(1);
                    return [3 /*break*/, 5];
                case 5:
                    // --- 3. Generate Issuer EdDSA Keypair (Baby Jubjub) ---
                    console.log("[INFO] Generating Issuer EdDSA Keypair...");
                    privateKeyBytes = crypto_1.default.randomBytes(32);
                    fs_1.default.writeFileSync(PRIVATE_KEY_FILE, privateKeyBytes.toString('hex'));
                    console.log("  - Private Key saved (hex): ".concat(PRIVATE_KEY_FILE));
                    F = poseidon.F;
                    try {
                        rawPublicKey = eddsa.prv2pub(privateKeyBytes);
                        publicKeyJson = {
                            Ax: F.toString(rawPublicKey[0]), // F.toString likely handles the internal type
                            Ay: F.toString(rawPublicKey[1])
                        };
                        publicKey = rawPublicKey; // Keep the original type if needed later
                        fs_1.default.writeFileSync(PUBLIC_KEY_FILE, JSON.stringify(publicKeyJson, null, 2));
                        console.log("  - Public Key (Ax, Ay) saved: ".concat(PUBLIC_KEY_FILE));
                        console.log("      Ax: ".concat(publicKeyJson.Ax));
                        console.log("      Ay: ".concat(publicKeyJson.Ay));
                    }
                    catch (error) {
                        console.error("[ERROR] Failed to derive/save public key:", error.message);
                        (0, process_1.exit)(1);
                    }
                    // --- 4. Define Example Certificate Data ---
                    console.log("[INFO] Defining Certificate Data...");
                    certificateData = {
                        subject: "did:example:user123",
                        issuer: "did:example:trustedIssuerCorp",
                        issuanceDate: new Date().toISOString(),
                        type: "ProofOfAgeCredential",
                        details: { age: 25, nationality: "ExampleLand" },
                        context: "Example Credential for ZK Proof Demo"
                    };
                    certString = JSON.stringify(certificateData, null, 2);
                    fs_1.default.writeFileSync(CERTIFICATE_DATA_FILE, certString);
                    console.log("  - Certificate data saved: ".concat(CERTIFICATE_DATA_FILE));
                    // --- 5. Hash Certificate Data (Robust Method: Keccak -> Split -> Poseidon) ---
                    console.log("[INFO] Hashing Certificate Data using Keccak256 -> Split(128b) -> Poseidon(2 inputs)...");
                    try {
                        messageBuffer = Buffer.from(certString, 'utf-8');
                        certKeccakHashHex = (0, ethers_1.keccak256)(messageBuffer);
                        console.log("  - Certificate Keccak256 Hash: ".concat(certKeccakHashHex));
                        hashHexNoPrefix = certKeccakHashHex.slice(2);
                        if (hashHexNoPrefix.length !== 64) { // Should be 32 bytes = 64 hex chars
                            throw new Error("Keccak hash has unexpected length: ".concat(hashHexNoPrefix.length));
                        }
                        chunk1Hex = hashHexNoPrefix.substring(0, 32);
                        chunk2Hex = hashHexNoPrefix.substring(32, 64);
                        chunk1BigInt = BigInt('0x' + chunk1Hex);
                        chunk2BigInt = BigInt('0x' + chunk2Hex);
                        messageHashOutput = poseidon([chunk1BigInt, chunk2BigInt]); // Let this be the type poseidon returns
                        messageHashString = messageHashOutput.toString(); // Use native toString() on the result
                        fs_1.default.writeFileSync(CERT_HASH_FILE, messageHashString);
                        console.log("     - Chunk1 (BigInt): ".concat(chunk1BigInt.toString().substring(0, 10), "..."));
                        console.log("     - Chunk2 (BigInt): ".concat(chunk2BigInt.toString().substring(0, 10), "..."));
                        // c. Hash the TWO chunks using Poseidon(2 inputs)
                        if (!poseidon || typeof poseidon !== 'function') {
                            throw new Error("Poseidon function is not available.");
                        }
                        messageHashBigInt = poseidon([chunk1BigInt, chunk2BigInt]); // Hash the two BigInt chunks
                        messageHashString = messageHashBigInt.toString(); // Final hash string
                        fs_1.default.writeFileSync(CERT_HASH_FILE, messageHashString);
                        console.log("  - Final Poseidon Hash (M) of Chunks saved: ".concat(CERT_HASH_FILE));
                        console.log("      Hash (M): ".concat(messageHashString));
                    }
                    catch (error) {
                        console.error("[ERROR] Failed during robust message hashing:", error.message);
                        if (error.stack)
                            console.error(error.stack);
                        (0, process_1.exit)(1);
                    }
                    // --- 6. Sign the Final Certificate Hash (EdDSA) ---
                    console.log("[INFO] Signing the *final* Poseidon Hash (M) using EdDSA...");
                    try {
                        if (!eddsa || typeof eddsa.signPoseidon !== 'function') {
                            throw new Error("EdDSA sign function not available.");
                        }
                        // Use the privateKeyBytes (Buffer) and the final messageHashBigInt (BigInt)
                        signature = eddsa.signPoseidon(privateKeyBytes, messageHashBigInt);
                        console.log("[INFO] EdDSA signing successful.");
                    }
                    catch (error) {
                        console.error("[ERROR] Failed during EdDSA signing:", error.message);
                        if (error.stack)
                            console.error(error.stack);
                        (0, process_1.exit)(1);
                    }
                    // --- 7. Format and Save Signature Components ---
                    console.log("[INFO] Formatting and saving signature...");
                    try {
                        // Use native BigInt.prototype.toString()
                        signatureJson = {
                            R8x: signature.R8[0].toString(),
                            R8y: signature.R8[1].toString(),
                            S: signature.S.toString()
                        };
                        fs_1.default.writeFileSync(SIGNATURE_FILE, JSON.stringify(signatureJson, null, 2));
                        console.log("  - Signature (R8x, R8y, S) saved: ".concat(SIGNATURE_FILE));
                        console.log("      R8x: ".concat(signatureJson.R8x));
                        console.log("      R8y: ".concat(signatureJson.R8y));
                        console.log("      S: ".concat(signatureJson.S));
                    }
                    catch (error) {
                        console.error("[ERROR] Failed to format or save signature components:", error.message);
                        (0, process_1.exit)(1);
                    }
                    // --- 8. Prepare Parameters for User ---
                    console.log("[INFO] Preparing parameters package for the user...");
                    paramsForUser = {
                        issuerAx: publicKeyJson.Ax, // Issuer Public Key X
                        issuerAy: publicKeyJson.Ay, // Issuer Public Key Y
                        messageHash: messageHashString, // FINAL Poseidon hash (that was signed)
                        signature_R8x: signatureJson.R8x, // Signature component
                        signature_R8y: signatureJson.R8y, // Signature component
                        signature_S: signatureJson.S, // Signature component
                        attributeValueFromCert: certificateData.details.age // User needs this secret value
                    };
                    fs_1.default.writeFileSync(PARAMS_FOR_USER_FILE, JSON.stringify(paramsForUser, null, 2));
                    console.log("  - Parameters for User saved: ".concat(PARAMS_FOR_USER_FILE));
                    // --- Completion ---
                    console.log("\n[SUCCESS] Issuer actions simulation complete.");
                    console.log("[INFO] Key files, signature, and user parameters are in the '".concat(OUTPUT_DIR, "' directory."));
                    console.log("[NEXT STEP] Provide the '".concat(PARAMS_FOR_USER_FILE, "' file to the user."));
                    console.log("[WARNING] The generated private key is insecure and for testing only.");
                    return [2 /*return*/];
            }
        });
    });
}
// --- Execute Main Function ---
main().catch(function (error) {
    console.error("\n[FATAL ERROR] An unexpected error occurred in issuer_actions:");
    console.error(error);
    (0, process_1.exit)(1); // Ensure script exits on unhandled error
});
