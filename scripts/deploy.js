// scripts/deploy.js

const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

/**
 * Reads the deployed contract addresses from a JSON file.
 * @returns {object} An object containing deployed addresses or an empty object.
 */
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

/**
 * Saves deployed contract addresses to a JSON file.
 * @param {object} addresses Object containing contract names and addresses.
 */
function saveDeployedAddresses(addresses) {
    const filePath = path.join(__dirname, '..', 'deployed_addresses.json');
    const currentAddresses = readDeployedAddresses();
    const updatedAddresses = { ...currentAddresses, ...addresses }; // Merge new addresses
    fs.writeFileSync(filePath, JSON.stringify(updatedAddresses, null, 2));
    console.log(`[INFO] Deployed addresses saved to ${filePath}`);
}

async function main() {
    console.log("--- Starting Deployment ---");
    const [deployer] = await hre.ethers.getSigners(); // Get the deployer account
    console.log(`Deploying contracts with the account: ${deployer.address}`);
    const balance = await deployer.getBalance();
    console.log(`Account balance: ${hre.ethers.utils.formatEther(balance)} ETH`);

    // --- 1. Deploy the Verifier Contract ---
    // Ensure this name matches the contract name inside 'contracts/VerifierSig.sol'
    const verifierContractName = "Groth16VerifierSigned"; // <--- RENAME IF NEEDED inside VerifierSig.sol
    console.log(`\nDeploying ${verifierContractName}...`);
    try {
        const VerifierFactory = await hre.ethers.getContractFactory(verifierContractName);
        const verifier = await VerifierFactory.deploy();
        await verifier.deployed(); // Wait for deployment transaction to be mined
        console.log(`[SUCCESS] ${verifierContractName} deployed to: ${verifier.address}`);
        saveDeployedAddresses({ verifier: verifier.address }); // Save the address
    } catch (error) {
        console.error(`[ERROR] Failed to deploy ${verifierContractName}:`, error);
        process.exit(1); // Exit if verifier fails to deploy
    }

    // Read verifier address (even if just deployed)
    const deployedAddrs = readDeployedAddresses();
    if (!deployedAddrs.verifier) {
         console.error("[ERROR] Verifier address could not be determined after deployment attempt.");
         process.exit(1);
    }
    const verifierAddress = deployedAddrs.verifier;

    // --- 2. Deploy the Attribute Registry Contract ---
    const registryContractName = "AttributeRegistrySig";
    console.log(`\nDeploying ${registryContractName} (linked to Verifier at ${verifierAddress})...`);
    try {
        const RegistryFactory = await hre.ethers.getContractFactory(registryContractName);
        // Pass the deployed verifier's address to the constructor
        const registry = await RegistryFactory.deploy(verifierAddress);
        await registry.deployed();
        console.log(`[SUCCESS] ${registryContractName} deployed to: ${registry.address}`);
        saveDeployedAddresses({ registry: registry.address }); // Save the address
    } catch (error) {
        console.error(`[ERROR] Failed to deploy ${registryContractName}:`, error);
        process.exit(1);
    }

    const registryAddress = readDeployedAddresses().registry; // Get registry address for issuer registration

    // --- 3. Optional: Register the Issuer ---
    console.log("\nAttempting to register the Issuer (using deployer's ETH address)...");
    const issuerOutputDir = path.join(__dirname, '..', 'issuer_output');
    const issuerPubKeyFile = path.join(issuerOutputDir, 'issuer_public_key.json');

    if (fs.existsSync(issuerPubKeyFile) && registryAddress) {
        try {
            const issuerPubKey = JSON.parse(fs.readFileSync(issuerPubKeyFile, 'utf-8'));
            // Use the deployer's address as the associated Ethereum address for this demo
            const issuerEthAddress = deployer.address;

            const registryInstance = await hre.ethers.getContractAt(registryContractName, registryAddress);

            console.log(`  - Registering Issuer ETH Address: ${issuerEthAddress}`);
            console.log(`  - Using Public Key Ax: ${issuerPubKey.Ax.substring(0, 10)}...`);
            console.log(`  - Using Public Key Ay: ${issuerPubKey.Ay.substring(0, 10)}...`);

            const tx = await registryInstance.registerIssuer(
                issuerEthAddress,
                issuerPubKey.Ax, // Passed as string/uint256
                issuerPubKey.Ay  // Passed as string/uint256
            );
            console.log(`  - Registration transaction sent: ${tx.hash}`);
            await tx.wait(); // Wait for confirmation
            console.log("  - Issuer registration transaction confirmed.");

            // Optional: Verify registration by checking mapping
            const pkHash = hre.ethers.utils.keccak256(
                hre.ethers.utils.defaultAbiCoder.encode(["uint256", "uint256"], [issuerPubKey.Ax, issuerPubKey.Ay])
            );
            const registeredAddr = await registryInstance.issuerPublicKeyToAddress(pkHash);
            if (registeredAddr.toLowerCase() === issuerEthAddress.toLowerCase()) {
                 console.log("[SUCCESS] Issuer public key successfully registered and verified on-chain.");
            } else {
                 console.warn(`[WARN] Verification failed: Registered address ${registeredAddr} does not match expected ${issuerEthAddress}`);
            }

        } catch (error) {
            console.warn(`[WARN] Failed to register issuer. This might be due to permissions, ` +
                         `the issuer already being registered, or an issue fetching data. Error: ${error.reason || error.message}`);
        }
    } else {
        if (!registryAddress) console.warn("[WARN] Skipping issuer registration because Registry address is unknown.");
        if (!fs.existsSync(issuerPubKeyFile)) console.warn(`[WARN] Skipping issuer registration: ${issuerPubKeyFile} not found.`);
    }

    console.log("\n--- Deployment Script Finished ---");
}

// --- Execute Main Function ---
main().catch((error) => {
    console.error("\n[FATAL ERROR] Deployment script failed:");
    console.error(error);
    process.exitCode = 1;
});