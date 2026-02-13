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

// Helper function to get vote count for a specific candidate
async function getCandidateVotes(electionId, candidateId) {
  try {
    const candidate = await contract.getCandidate(electionId, candidateId);
    return Number(candidate.voteCount || candidate[2] || 0);
  } catch (error) {
    console.error('Error getting candidate votes:', error);
    return 0;
  }
}

module.exports = contract;
module.exports.getCandidateVotes = getCandidateVotes;
module.exports.isVerifiedVoter = async (voterAddress) => {
  try {
    return await contract.isVerifiedVoter(voterAddress);
  } catch (error) {
    console.error('Error checking verified voter:', error);
    return false;
  }
};

