#!/bin/bash
# Script: ./bash_Scripts/setup_zk.sh (Example name)
set -e # Exit on error
echo "--- Running ZK Setup & Verifier Export ---"

CIRCUIT_NAME="ProveCommitmentWithSignature" # Check your actual circuit name
CIRCUIT_PATH="circuits/${CIRCUIT_NAME}.circom"
BUILD_DIR="build"
PTAU_FILE="pot12_final.ptau" # Powers of Tau file (MUST exist)
FINAL_ZKEY="${BUILD_DIR}/${CIRCUIT_NAME}_final.zkey"
VERIFIER_SOL="${BUILD_DIR}/../contracts/VerifierSig.sol" # Output directly to contracts


echo "[5/5] Exporting Solidity Verifier..."
npx snarkjs zkey export solidityverifier "$FINAL_ZKEY" "$VERIFIER_SOL"
if [ ! -f "$VERIFIER_SOL" ]; then echo "ERROR: Verifier contract export failed."; exit 1; fi

echo "[SUCCESS] ZK Setup complete. Final Key: $FINAL_ZKEY, Verifier Contract: $VERIFIER_SOL"