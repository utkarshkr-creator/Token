# Target your network (e.g., localhost or sepolia)
NETWORK=localhost # Or sepolia, etc.

echo "[INFO] Deploying contracts to network: $NETWORK..."
npx hardhat run scripts/deploy.cjs --network $NETWORK

# Verify output: Check for contract addresses and successful deployment messages.
# Check if 'deployed_addresses.json' was created/updated.
if [ ! -f "deployed_addresses.json" ]; then
    echo "[WARN] deployed_addresses.json not found. Deployment might have failed or script needs update."
else
    echo "[SUCCESS] Deployment script finished. Check logs and deployed_addresses.json."
fi
