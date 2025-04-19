# Get registry address using jq from the verified file
REGISTRY_ADDRESS=$(jq -r '.registry' deployed_addresses.json)
if [ -z "$REGISTRY_ADDRESS" ] || [ "$REGISTRY_ADDRESS" == "null" ]; then echo "ERROR: Cannot read registry address."; exit 1; fi
echo "Using Registry Address: $REGISTRY_ADDRESS"

# Choose the attribute name contextually (e.g., relates to the age 25 used)
ATTRIBUTE_NAME="age"

# Set the network name (MUST match where you just deployed)
NETWORK_NAME=localhost

echo "Submitting claim '$ATTRIBUTE_NAME' to registry $REGISTRY_ADDRESS on network $NETWORK_NAME..."

# Execute the Hardhat task (Hardhat automatically handles .ts/.cjs for tasks)
npx hardhat add-claim \
  --registry "$REGISTRY_ADDRESS" \
  --name "$ATTRIBUTE_NAME" \
  --network "$NETWORK_NAME"

echo "Check task output for success or failure..."