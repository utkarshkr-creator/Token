// tasks/addClaimTask.cjs
const { task } = require("hardhat/config");
const fs = require("fs");
const path = require("path");

// Define expected structure for proof.json and inputs format for clarity
// (Interfaces don't exist in CJS, use JSDoc or just check structure)

// Helper to parse files and format for Solidity call
function parseProofAndInputs(proofPath, publicPath) {
    console.log(`  [Debug] Parsing proof file: ${proofPath}`);
    const proof = JSON.parse(fs.readFileSync(proofPath, 'utf8'));
    console.log(`  [Debug] Parsing public inputs file: ${publicPath}`);
    const publicSignals = JSON.parse(fs.readFileSync(publicPath, 'utf8'));

    console.log("  [Debug] Formatting proof components...");
    // Format proof components (extract first 2 elements for Solidity verifier)
    const pi_a = [proof.pi_a[0], proof.pi_a[1]];
    const pi_b = [
        [proof.pi_b[0][1], proof.pi_b[0][0]], // Inner arrays reversed
        [proof.pi_b[1][1], proof.pi_b[1][0]]
    ];
    const pi_c = [proof.pi_c[0], proof.pi_c[1]];

    console.log("  [Debug] Formatting public signals...");
    // Public inputs order from public.json MUST match expected Solidity order
    // Order from circuit: [commitmentHash, issuerAx, issuerAy, messageHash]
    if (!Array.isArray(publicSignals) || publicSignals.length !== 4) {
        throw new Error(`Expected 4 public signals in ${publicPath}, but got ${publicSignals.length || 'invalid format'}`);
    }

    const formattedInputs = {
        commitmentHash: publicSignals[0],
        issuerAx: publicSignals[1],
        issuerAy: publicSignals[2],
        messageHash: publicSignals[3],
        a: pi_a,
        b: pi_b,
        c: pi_c
    };
    console.log("  [Debug] Proof and inputs parsing complete.");
    return formattedInputs;
}


task("add-claim", "Adds a claim to the AttributeRegistrySig contract")
  .addParam("registry", "The address of the AttributeRegistrySig contract")
  .addParam("name", "The name of the attribute (e.g., age)")
  .setAction(async (taskArgs, hre) => {
    // Log entry into action
    console.log("  [Debug] Entering add-claim task setAction...");
    const { registry: registryAddr, name: attributeName } = taskArgs;
    console.log(`  [Debug] Registry Address: ${registryAddr}`);
    console.log(`  [Debug] Attribute Name: ${attributeName}`);

    // Get ethers from HRE
    const { ethers } = hre;
    if (!ethers) {
        console.error("[FATAL TASK ERROR] hre.ethers is not available!");
        return; // or throw
    }
    console.log("  [Debug] Got hre.ethers instance.");

    // --- Define paths ---
    const buildDir = path.join(__dirname, '..', 'build');
    const proofPath = path.join(buildDir, 'proof.json');
    const publicPath = path.join(buildDir, 'public.json');
    console.log(`  [Debug] Expecting proof file: ${proofPath}`);
    console.log(`  [Debug] Expecting public file: ${publicPath}`);


    // --- Wrap EVERYTHING in a try...catch ---
    try {
         // --- Check file existence explicitly ---
         if (!fs.existsSync(proofPath)) {
             throw new Error(`Proof file not found at: ${proofPath}`);
         }
          if (!fs.existsSync(publicPath)) {
             throw new Error(`Public inputs file not found at: ${publicPath}`);
         }
         console.log("  [Debug] Proof and public files found.");


        // --- Parse proof and public inputs ---
        const callArgs = parseProofAndInputs(proofPath, publicPath);
        console.log("   Parsed Public Inputs for contract call:");
        console.log(`    Commitment Hash: ${callArgs.commitmentHash.substring(0,10)}...`);
        // ... (log other parsed args for confirmation) ...

        // --- Get Contract Instance ---
        const registryContractName = "AttributeRegistrySig"; // Match deployed name
        console.log(`  [Debug] Getting contract instance for ${registryContractName} at ${registryAddr}...`);
        const registry = await ethers.getContractAt(registryContractName, registryAddr);
        console.log("  [Debug] Got contract instance.");


        // --- Call addClaim ---
        console.log("\n   Submitting addClaim transaction...");
        const tx = await registry.addClaim(
            attributeName,
            callArgs.issuerAx,
            callArgs.issuerAy,
            callArgs.messageHash,
            callArgs.commitmentHash,
            callArgs.a,
            callArgs.b,
            callArgs.c
        );

        console.log(`   Transaction sent: ${tx.hash}`);
        console.log("   Waiting for confirmation...");
        const receipt = await tx.wait(); // Wait for 1 confirmation
        // Added optional chaining for safety in case receipt is null/undefined somehow
        console.log(`   Transaction confirmed! Block: ${receipt?.blockNumber}, Gas Used: ${receipt?.gasUsed?.toString()}`);
        console.log("[SUCCESS] Claim should be added to the registry.");

    } catch (error) {
        console.error("\n[TASK ERROR] An error occurred during the add-claim task:");
         console.error("-----------------------------------------------------");
        // Log the reason if it's a common Hardhat/Ethers error pattern
        if (error.reason) console.error("  Reason:", error.reason);
        // Log the full error object for more details
         console.error("  Full Error:", error);
         console.error("-----------------------------------------------------");
         if (error.stack) console.error("  Stack Trace:", error.stack);

        // Attempt to parse revert data if available
        if (error.data) {
             try {
                 // Get interface AFTER confirming ethers is available
                  const registryInterface = (await ethers.getContractFactory("AttributeRegistrySig")).interface;
                  const decodedError = registryInterface.parseError(error.data);
                 console.error(`   Contract Revert Decoded: ${decodedError?.name}(${decodedError?.args?.join(', ')})`);
             } catch (decodeErr) {
                 console.error("   Could not decode revert reason from error data.");
             }
        }
         // Optional: re-throw the error if you want Hardhat's runner to show it too
         // throw error;
    }
  });

// module.exports needed for CJS tasks
module.exports = {};