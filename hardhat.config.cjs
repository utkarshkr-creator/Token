// hardhat.config.cjs
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
// Correct the path here:
require("./tasks/addClaimTask.cjs"); // <-- ADDED / AFTER .
require("./tasks/registerIssuerTask.cjs");

module.exports = {
  solidity: "0.8.18",
  networks: {
    hardhat: {},
    localhost: { url: "http://127.0.0.1:8545" },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.TESTNET_PRIVATE_KEY !== undefined ? [process.env.TESTNET_PRIVATE_KEY] : [],
    },
  },
  // You might have other config sections like 'paths' here too
};