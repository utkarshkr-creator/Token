echo "[INFO] Generating Groth16 proof..."
snarkjs groth16 prove \
    build/ProveCommitmentWithSignature_final.zkey \
    build/witness.wtns \
    build/proof.json \
    build/public.json

if [ ! -f "build/proof.json" ] || [ ! -f "build/public.json" ]; then
    echo "[ERROR] Failed to generate proof.json or public.json"
    exit 1
fi
echo "[SUCCESS] Proof generated: build/proof.json, build/public.json"
