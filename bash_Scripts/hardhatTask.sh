# Get registry address (MUST run after successful deployment in Phase 3)
REGISTRY_ADDRESS=$(jq -r '.registry' deployed_addresses.json)
if [ -z "$REGISTRY_ADDRESS" ] || [ "$REGISTRY_ADDRESS" == "null" ]; then echo "ERROR: Cannot read registry address."; exit 1; fi
# Define attribute name
ATTRIBUTE_NAME="age"
# Define target network (MUST match Phase 3 deployment)
NETWORK_NAME=localhost