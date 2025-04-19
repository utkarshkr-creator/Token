echo "[INFO] Compiling Circom circuit (ProveCommitmentWithSignature.circom)..."
# Create output directories if they don't exist
mkdir -p build build/ProveCommitmentWithSignature_js

# Compile the circuit (check circomlib path if needed)
circom circuits/ProveCommitmentWithSignature.circom \
  --r1cs \
  --wasm \
  --sym \
  -o build # Output R1CS and SYM to build/, WASM to build/circuit_js/

# Verify output files exist
if [ ! -f "build/ProveCommitmentWithSignature.r1cs" ] || \
   [ ! -f "build/ProveCommitmentWithSignature_js/ProveCommitmentWithSignature.wasm" ]; then
   echo "[ERROR] Circom compilation failed. Check circuit code and paths."
   exit 1
fi
echo "[SUCCESS] Circom compilation complete."
