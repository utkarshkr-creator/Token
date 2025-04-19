// scripts/deploy.cjs

// Use require for CommonJS modules
const hre = require("hardhat"); // Hardhat Runtime Environment
const fs = require('fs');
const path = require('path');

// Helper Functions (using require syntax if needed inside, but mostly file operations)
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

function saveDeployedAddresses(addresses) {
    const filePath = path.join(__dirname, '..', 'deployed_addresses.json');
    const currentAddresses = readDeployedAddresses();
    const updatedAddresses = { ...currentAddresses, ...addresses };
    fs.writeFileSync(filePath, JSON.stringify(updatedAddresses, null, 2));
    console.log(`[INFO] Deployed addresses updated in ${filePath}`);
}
// --- End Helper Functions ---


async function main() {
    console.log("--- Starting Deployment (CommonJS) ---");
    // hre provides ethers object configured for the network
    const { ethers } = hre;
    const [deployer] = await ethers.getSigners();
    console.log(`Deploying contracts with account: ${deployer.address}`);
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`Account balance: ${ethers.formatEther(balance)} ETH`); // ethers v6 style

    // --- 1. Deploy the Verifier Contract ---
    const verifierContractName = "Groth16Verifier"; // Ensure this matches contract name in VerifierSig.sol
    console.log(`\nDeploying ${verifierContractName}...`);
    let verifier;
    let verifierAddress;
    try {
        const VerifierFactory = await ethers.getContractFactory(verifierContractName);
        verifier = await VerifierFactory.deploy();
        await verifier.waitForDeployment(); // ethers v6+ method
        verifierAddress = await verifier.getAddress(); // ethers v6+ method
        console.log(`[SUCCESS] ${verifierContractName} deployed to: ${verifierAddress}`);
        saveDeployedAddresses({ verifier: verifierAddress });
    } catch (error) {
        console.error(`[ERROR] Failed to deploy ${verifierContractName}:`, error.message);
        process.exit(1);
    }


    // --- 2. Deploy the Attribute Registry Contract ---
    const registryContractName = "AttributeRegistrySig";
    console.log(`\nDeploying ${registryContractName} (linked to Verifier at ${verifierAddress})...`);
    let registry;
    let registryAddress;
    try {
        const RegistryFactory = await ethers.getContractFactory(registryContractName);
        registry = await RegistryFactory.deploy(verifierAddress); // Pass verifier address
        await registry.waitForDeployment();
        registryAddress = await registry.getAddress();
        console.log(`[SUCCESS] ${registryContractName} deployed to: ${registryAddress}`);
        saveDeployedAddresses({ registry: registryAddress });
    } catch (error) {
        console.error(`[ERROR] Failed to deploy ${registryContractName}:`, error.message);
        process.exit(1);
    }

    // --- 3. REMOVED ISSUER REGISTRATION ---
    console.log("\n[INFO] Skipping issuer registration step (removed from deploy script).");
    // --- End Removed Section ---


    console.log("\n--- Deployment Script Finished ---");
}

main().catch((error) => {
    console.error("\n[FATAL ERROR] Deployment script failed:");
    console.error(error);
    process.exitCode = 1;
});

// No exports needed for Hardhat scripts run via `npx hardhat run`