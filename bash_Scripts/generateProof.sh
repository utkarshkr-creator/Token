echo "[INFO] Generating Groth16 proof..."

# Define file paths (Ensure these match your setup)
FINAL_ZKEY="build/ProveCommitmentWithSignature_final.zkey"
WITNESS_FILE="build/witness.wtns"
PROOF_JSON="build/proof.json"
PUBLIC_JSON="build/public.json"

# Verify required files exist
if [ ! -f "$FINAL_ZKEY" ]; then echo "[ERROR] Final proving key not found: $FINAL_ZKEY"; exit 1; fi
if [ ! -f "$WITNESS_FILE" ]; then echo "[ERROR] Witness file not found: $WITNESS_FILE"; exit 1; fi

# Generate the proof
npx snarkjs groth16 prove \
    "$FINAL_ZKEY" \
    "$WITNESS_FILE" \
    "$PROOF_JSON" \
    "$PUBLIC_JSON"

# Verify output files were created
if [ ! -f "$PROOF_JSON" ] || [ ! -f "$PUBLIC_JSON" ]; then
    echo "[ERROR] Failed to generate proof.json or public.json. Check snarkjs output."
    exit 1
fi

echo "[SUCCESS] Proof generated: $PROOF_JSON"
echo "[SUCCESS] Public inputs saved: $PUBLIC_JSON"
echo "[NEXT STEP] Submit proof and public data to the smart contract via Hardhat task."