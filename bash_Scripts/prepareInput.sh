#!/bin/bash
set -e
echo "[Bash] Preparing random inputs (ESM with specifier flag)..."
# Use .ts file with ts-node
NODE_EXECUTOR="node"
NODE_SCRIPT="scripts/generate_random_inputs_iden3.cjs" # Still use TS file

# If you converted to plain JS:
# NODE_EXECUTOR="node"
# NODE_SCRIPT="scripts/generate_random_inputs_iden3.js"

BUILD_DIR="build"
mkdir -p "$BUILD_DIR"

if [ ! -f "$NODE_SCRIPT" ]; then echo "[Bash ERROR] Node script not found: ${NODE_SCRIPT}"; exit 1; fi

# Add NODE_OPTIONS flag before the executor
echo "[Bash] Executing Node script with experimental specifier resolution..."
NODE_OPTIONS='--experimental-specifier-resolution=node' "$NODE_EXECUTOR" "$NODE_SCRIPT"

if [ $? -ne 0 ]; then echo "[Bash ERROR] Node script failed!"; exit 1; fi

# ... rest of the script (verify output etc.) ...
echo "[Bash SUCCESS] Generated build/input.json."
echo "[Bash] Proceeding to witness calculation..."
# ./bash_Scripts/witness.sh