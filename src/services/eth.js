import { ethers } from "ethers";
import { loadConfig } from "../config/env.js";

const cfg = loadConfig();

const ABI = [
  "function register(bytes32 hash, string uri) public",
  "function isRegistered(bytes32 hash) public view returns (bool)"
];

function getProvider() {
  if (!cfg.eth.rpcUrl) return null;
  return new ethers.JsonRpcProvider(cfg.eth.rpcUrl, cfg.eth.chainId || undefined);
}

function getWallet(provider) {
  if (!provider || !cfg.eth.privateKey) return null;
  try {
    return new ethers.Wallet(cfg.eth.privateKey, provider);
  } catch {
    return null;
  }
}

function getContract(signerOrProvider) {
  if (!cfg.eth.contractAddress) return null;
  return new ethers.Contract(cfg.eth.contractAddress, ABI, signerOrProvider);
}

function toBytes32FromHex(hashHex) {
  const hex = hashHex.startsWith("0x") ? hashHex : `0x${hashHex}`;
  if (ethers.dataLength(hex) !== 32) {
    throw new Error("Invalid hash length for bytes32");
  }
  return hex;
}

export async function isRegisteredOnChain(hashHex) {
  const provider = getProvider();
  if (!provider || !cfg.eth.contractAddress) return false;
  const contract = getContract(provider);
  const bytes32 = toBytes32FromHex(hashHex);
  return await contract.isRegistered(bytes32);
}

export async function registerHashOnChain(hashHex, uri) {
  const provider = getProvider();
  const wallet = getWallet(provider);
  if (!wallet || !cfg.eth.contractAddress) {
    return { submitted: false, reason: "Wallet or contract not configured" };
  }
  const contract = getContract(wallet);
  const bytes32 = toBytes32FromHex(hashHex);
  const tx = await contract.register(bytes32, uri);
  const receipt = await tx.wait();
  return { submitted: true, txHash: receipt.hash };
}