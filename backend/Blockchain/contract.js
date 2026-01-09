import { ethers } from "ethers";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------- Load ABI ----------
const abiPath = path.join(__dirname, "..", "contracts", "VotingSystem.json");
const ABI = JSON.parse(fs.readFileSync(abiPath, "utf8"));

// ---------- Provider ----------
const provider = new ethers.JsonRpcProvider(
  process.env.RPC_URL,
  {
    name: "ganache",
    chainId: 1337, // Ganache default
  }
);

// ---------- Signer (ADMIN wallet) ----------
const signer = new ethers.Wallet(
  process.env.PRIVATE_KEY,
  provider
);

// ---------- Contract Instance ----------
const contract = new ethers.Contract(
  process.env.CONTRACT_ADDRESS,
  ABI,
  signer
);

export default contract;
