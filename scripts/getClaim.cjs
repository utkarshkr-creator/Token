// scripts/getClaim.cjs

// Use require for CommonJS modules
const hre = require("hardhat"); // Hardhat Runtime Environment
const fs = require('fs');
const path = require('path');

// Helper Functions (remain the same, using require if needed internally)
function readDeployedAddresses() {
    const filePath = path.join(__dirname, '..', 'deployed_addresses.json');
    if (fs.existsSync(filePath)) {
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(content);
        } catch (error) {
            console.warn(`[WARN] Could not parse ${filePath}: ${error.message}`);
            return {};
        }
    }
    console.error(`[ERROR] Deployed addresses file not found: ${filePath}`);
    return {};
}
// --- End Helper Functions ---


async function main() {
    console.log("--- Reading Claim Data from Contract (CommonJS) ---");

    // --- 1. Get Contract Address and Signer ---
    const addresses = readDeployedAddresses();
    const registryAddress = addresses.registry;

    if (!registryAddress) {
        console.error("[ERROR] Registry contract address not found in deployed_addresses.json. Deploy first.");
        process.exit(1);
    }
    console.log(`Using Registry Contract Address: ${registryAddress}`);

    // Get ethers instance from HRE
    const { ethers } = hre;
    const [signer] = await ethers.getSigners();
    const userAddress = signer.address;
    console.log(`Checking claim for User Address: ${userAddress}`);

    // --- 2. Define Attribute Name ---
    const attributeName = "age"; // The name used when calling addClaim
    console.log(`Attribute Name: "${attributeName}"`);


    // --- 3. Get Contract Instance ---
    const registryContractName = "AttributeRegistrySig"; // Must match the deployed contract name
    let registry;
    try {
        registry = await ethers.getContractAt(registryContractName, registryAddress, signer);
        console.log(`Attached to ${registryContractName} at ${await registry.getAddress()}`);
    } catch(error) {
        console.error(`[ERROR] Failed to attach to contract: ${error.message}`);
        process.exit(1);
    }


    // --- 4. Call getClaim Function ---
    console.log("\nCalling contract's getClaim function...");
    try {
        const claimData = await registry.getClaim(userAddress, attributeName);

        // Destructure the returned tuple/array
        const [issuerAx, issuerAy, commitmentHash, exists] = claimData;

        // --- 5. Display Results ---
        console.log("\n--- Claim Data Retrieved ---");
        console.log(`Claim Exists: ${exists}`);

        if (exists) {
            // Read expected values from public.json for comparison
            const publicJsonPath = path.join(__dirname, '..', 'build', 'public.json');
            let expectedCommitment;
            let expectedAx;
            let expectedAy;

            if (fs.existsSync(publicJsonPath)){
                 try {
                     const publicSignals = JSON.parse(fs.readFileSync(publicJsonPath, 'utf-8'));
                     // Order: [commitmentHash, issuerAx, issuerAy, messageHash]
                     expectedCommitment = publicSignals[0];
                     expectedAx = publicSignals[1];
                     expectedAy = publicSignals[2];
                 } catch (e) {
                      console.warn(`[WARN] Could not read or parse ${publicJsonPath}`);
                 }
            }

            // Use .toString() on BigInts returned from the contract call
            console.log(`  Stored Commitment Hash: ${commitmentHash.toString()}`);
             if (expectedCommitment !== undefined) console.log(`  (Expected Commitment):  ${expectedCommitment}`);
            console.log(`  Stored Issuer Ax:       ${issuerAx.toString()}`);
             if (expectedAx !== undefined) console.log(`  (Expected Issuer Ax):   ${expectedAx}`);
            console.log(`  Stored Issuer Ay:       ${issuerAy.toString()}`);
             if (expectedAy !== undefined) console.log(`  (Expected Issuer Ay):   ${expectedAy}`);

            // Compare strings
             if (expectedCommitment !== undefined && commitmentHash.toString() === expectedCommitment &&
                 expectedAx !== undefined && issuerAx.toString() === expectedAx &&
                 expectedAy !== undefined && issuerAy.toString() === expectedAy) {
                console.log("\n[SUCCESS] Stored values match the public inputs used for the last proof.");
             } else if (expectedCommitment !== undefined || expectedAx !== undefined || expectedAy !== undefined) {
                console.warn("\n[WARN] Stored values DO NOT perfectly match values in build/public.json. Check if expected.");
             } else {
                console.log("\n[INFO] Cannot compare stored values: build/public.json not found or invalid.");
             }

        } else {
            console.log("  -> No claim found for this user and attribute name.");
        }

    } catch (error) {
        console.error("\n[ERROR] Failed to call getClaim:", error.reason || error.message);
        process.exit(1);
    }

    console.log("\n--- Get Claim Script Finished ---");
}

// --- Execute Main Function ---
main().catch((error) => {
    console.error("\n[FATAL ERROR] Script failed:");
    console.error(error);
    process.exitCode = 1;
});

// module.exports not needed for scripts run via `npx hardhat run`