# Make sure build/ProveCommitmentWithSignature.r1cs exists from compilation
# Make sure pot12_final.ptau exists in project root

echo "[INFO] Re-running Groth16 setup..."
npx snarkjs groth16 setup \
  build/ProveCommitmentWithSignature.r1cs \
  pot16_final.ptau \
  build/ProveCommitmentWithSignature_0000.zkey

echo "[INFO] Re-contributing randomness..."
# Okay to use same entropy for testing
npx snarkjs zkey contribute \
  build/ProveCommitmentWithSignature_0000.zkey \
  build/ProveCommitmentWithSignature_final.zkey \
  --name="Test Contribution Repeat" -v -e="more random entropy"

# Verify the final key is created NOW
if [ ! -f "build/ProveCommitmentWithSignature_final.zkey" ]; then
   echo "[ERROR] Failed to create final ZKey during setup."
   exit 1
fi
echo "[SUCCESS] Final proving key generated: build/ProveCommitmentWithSignature_final.zkey"

# Optional: Re-export verification key/verifier if needed, though likely not the cause of this specific error
# snarkjs zkey export verificationkey ...
# snarkjs zkey export solidityverifier ...