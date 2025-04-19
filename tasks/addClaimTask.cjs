// tasks/addClaimTask.cjs
const { task } = require("hardhat/config");
const fs = require("fs");
const path = require("path");

// Helper to clean string and convert to BigInt (same as deploy script)
function stringToBigInt(input) {
    if (input === undefined || input === null) throw new Error("Input string is null or undefined");
    const cleanStr = String(input).replace(/,/g, '');
    if (!/^\d+$/.test(cleanStr)) throw new Error(`Invalid non-digit character in string: ${cleanStr}`);
    return BigInt(cleanStr);
}

// Helper to parse proof/public files
function parseProofAndInputs(proofPath, publicPath) {
    const proof = JSON.parse(fs.readFileSync(proofPath, 'utf8'));
    const publicSignals = JSON.parse(fs.readFileSync(publicPath, 'utf8')); // Array of strings

    if (!Array.isArray(publicSignals) || publicSignals.length !== 4) {
        throw new Error(`Expected 4 public signals, got ${publicSignals.length}`);
    }
    // Proof components remain strings/arrays of strings
    const pi_a = [proof.pi_a[0], proof.pi_a[1]];
    const pi_b = [
        [proof.pi_b[0][1], proof.pi_b[0][0]],
        [proof.pi_b[1][1], proof.pi_b[1][0]]
    ];
    const pi_c = [proof.pi_c[0], proof.pi_c[1]];

    // Public signals are read as strings from JSON
    const formattedInputs = {
        commitmentHashStr: publicSignals[0],
        issuerAxStr:       publicSignals[1],
        issuerAyStr:       publicSignals[2],
        messageHashStr:    publicSignals[3],
        a: pi_a,
        b: pi_b,
        c: pi_c
    };
    return formattedInputs;
}

task("add-claim", "Adds a claim...")
  .addParam("registry", "Registry address")
  .addParam("name", "Attribute name")
  .setAction(async (taskArgs, hre) => {
    const { registry: registryAddr, name: attributeName } = taskArgs;
    console.log(`Adding claim '${attributeName}' to registry: ${registryAddr}`);
    const { ethers } = hre;

    const buildDir = path.join(__dirname, '..', 'build');
    const proofPath = path.join(buildDir, 'proof.json');
    const publicPath = path.join(buildDir, 'public.json');

    try {
        if (!fs.existsSync(proofPath)) throw new Error(`Proof file missing: ${proofPath}`);
        if (!fs.existsSync(publicPath)) throw new Error(`Public file missing: ${publicPath}`);

        // --- Parse inputs ---
        const callArgs = parseProofAndInputs(proofPath, publicPath);
        console.log("   Parsed Public Inputs (Strings):");
        console.log(`    CommitmentHash: ${callArgs.commitmentHashStr.substring(0,10)}...`);
        console.log(`    IssuerAx: ${callArgs.issuerAxStr.substring(0,10)}...`);
        // ...

        // --- Convert necessary public inputs to BigInt for contract call ---
        const commitmentHashBigInt = stringToBigInt(callArgs.commitmentHashStr);
        const issuerAxBigInt       = stringToBigInt(callArgs.issuerAxStr);
        const issuerAyBigInt       = stringToBigInt(callArgs.issuerAyStr);
        const messageHashBigInt    = stringToBigInt(callArgs.messageHashStr);
        console.log("   Converted public inputs to BigInt for contract call.");


        // --- Get Contract Instance ---
        const registryContractName = "AttributeRegistrySig";
        const registry = await ethers.getContractAt(registryContractName, registryAddr);
        console.log("  [Debug] Got contract instance.");


        // --- Call addClaim with BigInts ---
        console.log("\n   Submitting addClaim transaction...");
        const tx = await registry.addClaim(
            attributeName,
            issuerAxBigInt,        // Pass BigInt
            issuerAyBigInt,        // Pass BigInt
            messageHashBigInt,     // Pass BigInt
            commitmentHashBigInt,  // Pass BigInt
            callArgs.a,           // Proof components (strings/arrays)
            callArgs.b,
            callArgs.c
        );

        console.log(`   Transaction sent: ${tx.hash}`);
        console.log("   Waiting for confirmation...");
        const receipt = await tx.wait();
        console.log(`   Transaction confirmed! Block: ${receipt?.blockNumber}`);
        console.log("[SUCCESS] Claim should be added.");

    } catch (error) { /* ... error handling (as before) ... */
        console.error("\n[TASK ERROR]", error.reason || error.message || error);
         if (error.stack && !error.reason) console.error("  Stack:", error.stack);
    }
  });

module.exports = {};