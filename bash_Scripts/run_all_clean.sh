#!/bin/bash

# Exit on ANY error
set -e

echo "========================================="
echo "=== STARTING CLEAN END-TO-END EXECUTION ==="
echo "========================================="

# --- 1. SUPER CLEAN ---
echo "[PHASE 1] Cleaning ALL generated files..."
rm -rf build/
rm -rf artifacts/
rm -rf cache/
rm -rf typechain-types/
rm -f contracts/VerifierSig.sol
rm -f deployed_addresses.json
# Add any other specific output files you know of
sync # Ensure filesystem writes complete (relevant on some systems/VMs)
echo "[OK] Clean complete."
sleep 1 # Small pause just in case


# --- 4. PROOF GENERATION ---
echo "\n[PHASE 4] Generating Proof..."
echo "  - Generating input.json..."
# Use the script that generates random inputs INTERNALLY
# Assumes using ts-node with the .ts file
npx node scripts/generate_random_inputs_iden3.cjs
# bash ./bash_Scripts/prepareInput.sh # Use this line INSTEAD if using the external param file method
if [ ! -f "build/input.json" ]; then echo "ERROR: input.json generation failed."; exit 1; fi

echo "  - prepare Input..."
bash ./bash_Scripts/compile.sh
bash ./bash_Scripts/trustedSetup.sh
bash ./bash_Scripts/prepareInput.sh # Assumes this runs witness calc correctly

echo "  - Calculating witness..."
bash ./bash_Scripts/witness.sh # Assumes this runs witness calc correctly
if [ ! -f "build/witness.wtns" ]; then echo "ERROR: witness.wtns generation failed."; exit 1; fi

echo "  - Generating proof..."
bash ./bash_Scripts/generateProof.sh # Assumes this runs snarkjs prove correctly
if [ ! -f "build/proof.json" ]; then echo "ERROR: proof.json generation failed."; exit 1; fi
if [ ! -f "build/public.json" ]; then echo "ERROR: public.json generation failed."; exit 1; fi
echo "[OK] Proof generation complete."

# --- 2. ZK SETUP & VERIFIER EXPORT ---
echo "\n[PHASE 2] Running ZK Setup..."
bash ./bash_Scripts/getVerfierContract.sh # Assumes this script generates VerifierSig.sol correctly
# **Manual Step Reminder:** Need to fix pragma/name in generated contracts/VerifierSig.sol HERE if script doesn't do it.
echo "** PAUSE: Manually fix pragma/name in contracts/VerifierSig.sol if needed, then press Enter **"
# read -p "" # Uncomment this line to force a manual pause

# --- 3. HARDHAT COMPILE & DEPLOY ---
echo "\n[PHASE 3] Compiling & Deploying Contracts..."
NETWORK_NAME=localhost # Or your target network
echo "  - Cleaning Hardhat artifacts just in case..."
npx hardhat clean
echo "  - Compiling Solidity contracts..."
npx hardhat compile
echo "  - Deploying contracts to $NETWORK_NAME..."
# Ensure deploy script uses CORRECT Verifier name and NO issuer registration
npx hardhat run scripts/deploy.cjs --network $NETWORK_NAME # Or deploy.ts
# Check critical output file exists
if [ ! -f "deployed_addresses.json" ]; then echo "ERROR: deployed_addresses.json missing after deployment!"; exit 1; fi
REGISTRY_ADDRESS=$(jq -r '.registry' deployed_addresses.json)
if [ -z "$REGISTRY_ADDRESS" ] || [ "$REGISTRY_ADDRESS" == "null" ]; then echo "ERROR: Invalid registry address in JSON"; exit 1; fi
echo "[OK] Deployment seems successful. Registry: $REGISTRY_ADDRESS"


# --- 5. ADD CLAIM TASK ---
echo "\n[PHASE 5] Submitting Claim via Hardhat Task..."
ATTRIBUTE_NAME="age_run_$(date +%s)" # Use unique name to avoid ClaimAlreadyExists

# Ensure task parsing logic is correct (especially pi_b)
echo "  - Executing add-claim task..."
npx hardhat add-claim \
  --registry "$REGISTRY_ADDRESS" \
  --name "$ATTRIBUTE_NAME" \
  --network "$NETWORK_NAME"

# Check task exit status
if [ $? -ne 0 ]; then
    echo "[FAIL] add-claim task failed on network $NETWORK_NAME!"
    exit 1
else
    echo "[SUCCESS] add-claim task completed successfully on network $NETWORK_NAME!"
fi

echo "\n========================================="
echo "=== END-TO-END EXECUTION FINISHED ======="
echo "========================================="