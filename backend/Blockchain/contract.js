const { ethers } = require("ethers");
require("dotenv").config();
const fs = require("fs");
const path = require("path");

// Load ABI
const abiPath = path.join(__dirname, "..", "contracts", "VotingSystem.json");
const ABI = JSON.parse(fs.readFileSync(abiPath, "utf8"));

// Provider
const provider = new ethers.JsonRpcProvider(
  process.env.RPC_URL,
  {
    name: "ganache",
    chainId: 1337, // Ganache default
  }
);

// Signer (ADMIN wallet)
const signer = new ethers.Wallet(
  process.env.PRIVATE_KEY,
  provider
);

// Contract Instance
const contract = new ethers.Contract(
  process.env.CONTRACT_ADDRESS,
  ABI,
  signer
);
console.log("RPC_URL:", process.env.RPC_URL);
console.log("CONTRACT_ADDRESS:", process.env.CONTRACT_ADDRESS);
console.log("PRIVATE_KEY exists:", !!process.env.PRIVATE_KEY);

module.exports = contract;
