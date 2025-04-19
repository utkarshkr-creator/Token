// tasks/registerIssuerTask.cjs
const { task } = require("hardhat/config");
const fs = require("fs");
const path = require("path");

task("register-issuer", "Registers an issuer in the AttributeRegistrySig contract")
  .addParam("registry", "The address of the AttributeRegistrySig contract")
  .addParam("issuer", "The address of the issuer to register")
  .setAction(async (taskArgs, hre) => {
    console.log("  [Debug] Entering register-issuer task...");
    const { registry: registryAddr, issuer: issuerAddr } = taskArgs;
    console.log(`  [Debug] Registry Address: ${registryAddr}`);
    console.log(`  [Debug] Issuer Address: ${issuerAddr}`);

    const { ethers } = hre;
    if (!ethers) {
        console.error("[FATAL TASK ERROR] hre.ethers is not available!");
        return;
    }

    try {
        // Validate addresses
        if (!ethers.utils.isAddress(registryAddr)) {
            throw new Error(`Invalid registry address: ${registryAddr}`);
        }
        if (!ethers.utils.isAddress(issuerAddr)) {
            throw new Error(`Invalid issuer address: ${issuerAddr}`);
        }

        // Get public inputs to extract issuer public key
        const buildDir = path.join(__dirname, '..', 'build');
        const publicPath = path.join(buildDir, 'public.json');
        
        if (!fs.existsSync(publicPath)) {
            throw new Error(`Public inputs file not found at: ${publicPath}`);
        }
        
        const publicSignals = JSON.parse(fs.readFileSync(publicPath, 'utf8'));
        // Order from circuit: [commitmentHash, issuerAx, issuerAy, messageHash]
        const issuerAx = publicSignals[1];
        const issuerAy = publicSignals[2];
        
        console.log(`  [Debug] Issuer Public Key X: ${issuerAx.substring(0,10)}...`);
        console.log(`  [Debug] Issuer Public Key Y: ${issuerAy.substring(0,10)}...`);

        // Get contract instance
        const registry = await ethers.getContractAt("AttributeRegistrySig", registryAddr);
        
        // Register the issuer
        console.log("\n   Submitting registerIssuer transaction...");
        const tx = await registry.registerIssuer(issuerAddr, issuerAx, issuerAy);
        
        console.log(`   Transaction sent: ${tx.hash}`);
        console.log("   Waiting for confirmation...");
        const receipt = await tx.wait();
        console.log(`   Transaction confirmed! Block: ${receipt?.blockNumber}, Gas Used: ${receipt?.gasUsed?.toString()}`);
        console.log("[SUCCESS] Issuer registered successfully.");

    } catch (error) {
        console.error("\n[TASK ERROR] An error occurred during the register-issuer task:");
        console.error("-----------------------------------------------------");
        if (error.reason) console.error("  Reason:", error.reason);
        console.error("  Full Error:", error);
        console.error("-----------------------------------------------------");
        if (error.stack) console.error("  Stack Trace:", error.stack);
    }
  });

module.exports = {};