// scripts/deploy.cjs
const hre = require("hardhat"); // Use require for CJS
const fs = require("fs");
const path = require("path");

// --- Helper Functions ---
// Reads existing addresses or returns empty object
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
    return {};
}

// Saves/updates addresses to the JSON file
function saveDeployedAddresses(newAddresses) {
    const filePath = path.join(__dirname, '..', 'deployed_addresses.json');
    const currentAddresses = readDeployedAddresses();
    // Merge new addresses, potentially overwriting existing ones for same keys
    const updatedAddresses = { ...currentAddresses, ...newAddresses };
    try {
        fs.writeFileSync(filePath, JSON.stringify(updatedAddresses, null, 2));
        console.log(`[INFO] Deployed addresses updated in ${filePath}`);
    } catch (error) {
        console.error(`[ERROR] Failed to save addresses to ${filePath}:`, error.message);
    }
}

async function main() {
    console.log("--- Starting Full Deployment Script ---");
    const [deployer] = await hre.ethers.getSigners();
    console.log(`Deploying contracts with account: ${deployer.address}`);
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log(`Account balance: ${hre.ethers.formatEther(balance)} ETH`);

    let verifierAddress; // Variable to store verifier address

    // --- 1. Deploy the Verifier Contract ---
    // Ensure this name matches the contract name inside 'contracts/VerifierSig.sol'
    const verifierContractName = "Groth16VerifierSigned"; // ** VERIFY THIS NAME **
    console.log(`\nDeploying ${verifierContractName}...`);
    try {
        const VerifierFactory = await hre.ethers.getContractFactory(verifierContractName);
        console.log(`  - Got factory for ${verifierContractName}`);
        const verifier = await VerifierFactory.deploy();
        // Use getDeployTransaction if needed in v6 for hash before waiting
        console.log(`  - Deploy transaction sent: ${verifier.deploymentTransaction()?.hash}`);
        await verifier.waitForDeployment(); // Wait for deployment confirmation
        verifierAddress = await verifier.getAddress(); // Get the deployed address
        console.log(`[SUCCESS] ${verifierContractName} deployed to: ${verifierAddress}`);
        saveDeployedAddresses({ verifier: verifierAddress });
    } catch (error) {
        console.error(`\n\n[FATAL ERROR] Failed during ${verifierContractName} deployment:`);
        console.error("----------------------------------------------");
        console.error(error.reason || error.message || error);
        console.error("----------------------------------------------");
        if (error.stack) console.error("Stack trace:", error.stack);
        process.exit(1); // Exit script if verifier fails
    }

    // --- 2. Deploy the Attribute Registry Contract ---
    // Check if verifier deployed successfully before proceeding
    if (!verifierAddress) {
         console.error("[FATAL ERROR] Verifier address is missing after deployment attempt. Exiting.");
         process.exit(1);
    }
    const registryContractName = "AttributeRegistrySig";
    console.log(`\nDeploying ${registryContractName} (linked to Verifier at ${verifierAddress})...`);
    let registryAddress; // Variable to store registry address
    try {
        const RegistryFactory = await hre.ethers.getContractFactory(registryContractName);
        console.log(`  - Got factory for ${registryContractName}`);
        // Pass the verified verifier's address to the constructor
        const registry = await RegistryFactory.deploy(verifierAddress);
        console.log(`  - Deploy transaction sent: ${registry.deploymentTransaction()?.hash}`);
        await registry.waitForDeployment();
        registryAddress = await registry.getAddress();
        console.log(`[SUCCESS] ${registryContractName} deployed to: ${registryAddress}`);
        saveDeployedAddresses({ registry: registryAddress }); // Add registry address to the file
    } catch (error) {
        console.error(`\n\n[FATAL ERROR] Failed during ${registryContractName} deployment:`);
        console.error("----------------------------------------------");
        console.error(error.reason || error.message || error);
        console.error("----------------------------------------------");
        if (error.stack) console.error("Stack trace:", error.stack);
        process.exit(1); // Exit script if registry fails
    }

    // --- 3. Optional: Register the Issuer ---
     if (!registryAddress) {
         console.error("[FATAL ERROR] Registry address is missing after deployment attempt. Cannot register issuer.");
         process.exit(1);
     }
    console.log("\nAttempting to register the Issuer (using deployer's ETH address)...");
    const issuerOutputDir = path.join(__dirname, '..', 'issuer_output');
    const issuerPubKeyFile = path.join(issuerOutputDir, 'issuer_public_key.json');

    if (fs.existsSync(issuerPubKeyFile)) {
        try {
            const issuerPubKey = JSON.parse(fs.readFileSync(issuerPubKeyFile, 'utf-8'));
            const issuerEthAddress = deployer.address; // Using deployer address as issuer ID

            // Get contract instance at the deployed address
            const registryInstance = await hre.ethers.getContractAt(registryContractName, registryAddress);

            console.log(`  - Registering Issuer ETH Address: ${issuerEthAddress}`);
            // Log parts of keys for confirmation without revealing full value easily
            console.log(`  - Using Public Key Ax: ${String(issuerPubKey.Ax).substring(0, 10)}...`);
            console.log(`  - Using Public Key Ay: ${String(issuerPubKey.Ay).substring(0, 10)}...`);

            // Ensure values are passed correctly (as strings which Solidity converts)
            const tx = await registryInstance.registerIssuer(
                issuerEthAddress,
                issuerPubKey.Ax,
                issuerPubKey.Ay
            );
            console.log(`  - Registration transaction sent: ${tx.hash}`);
            const receipt = await tx.wait(); // Wait for confirmation
            console.log(`  - Issuer registration confirmed in block: ${receipt.blockNumber}`);

            // Optional: Verify registration by querying the contract state
            // Use hre.ethers utilities for encoding and hashing
            const pkHash = hre.ethers.keccak256(
                hre.ethers.AbiCoder.defaultAbiCoder().encode(["uint256", "uint256"], [issuerPubKey.Ax, issuerPubKey.Ay])
            );
            const registeredAddr = await registryInstance.issuerPublicKeyToAddress(pkHash);
            console.log(`  - Verifying registration: Querying address for PK hash ${pkHash.substring(0,10)}...`);
            if (registeredAddr.toLowerCase() === issuerEthAddress.toLowerCase()) {
                 console.log(`[SUCCESS] Issuer registration verified on-chain. Registered address: ${registeredAddr}`);
            } else {
                 console.warn(`[WARN] On-chain verification failed: Registered address ${registeredAddr} does not match expected ${issuerEthAddress}`);
            }

        } catch (error) {
            console.warn(`[WARN] Failed to register issuer. Possible reasons: already registered, contract permissions, tx revert.`);
            console.warn(`       Error details: ${error.reason || error.message}`);
        }
    } else {
        console.warn(`[WARN] Skipping issuer registration: ${issuerPubKeyFile} not found.`);
    }

    console.log("\n--- Full Deployment Script Finished ---");
}

// --- Execute Main Function ---
main().catch((error) => {
    console.error("\n[FATAL ERROR] Uncaught exception in main deployment function:");
    console.error("----------------------------------------------");
    console.error(error);
    console.error("----------------------------------------------");
    if (error.stack) console.error("Stack trace:", error.stack);
    process.exitCode = 1;
    process.exit(1); // Force exit
});