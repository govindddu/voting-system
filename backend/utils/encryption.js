const crypto = require("crypto");

// Encryption config - use environment variables in production
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "your-secret-encryption-key-min-32-chars-long!";
const ALGORITHM = "aes-256-cbc";

// Ensure key is 32 bytes for aes-256
const getEncryptionKey = () => {
    const key = ENCRYPTION_KEY.padEnd(32, "0").substring(0, 32);
    return Buffer.from(key);
};

/**
 * Encrypt sensitive data (private keys)
 * @param {string} data - Data to encrypt
 * @returns {string} - Encrypted data with IV (IV:encryptedData)
 */
const encrypt = (data) => {
    try {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
        let encrypted = cipher.update(data, "utf8", "hex");
        encrypted += cipher.final("hex");
        // Return IV + encrypted data separated by ':'
        return iv.toString("hex") + ":" + encrypted;
    } catch (error) {
        throw new Error(`Encryption failed: ${error.message}`);
    }
};

/**
 * Decrypt sensitive data
 * @param {string} encryptedData - Encrypted data (IV:encryptedData format)
 * @returns {string} - Decrypted data
 */
const decrypt = (encryptedData) => {
    try {
        const parts = encryptedData.split(":");
        if (parts.length !== 2) {
            throw new Error("Invalid encrypted data format");
        }
        const iv = Buffer.from(parts[0], "hex");
        const encrypted = parts[1];
        const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
        let decrypted = decipher.update(encrypted, "hex", "utf8");
        decrypted += decipher.final("utf8");
        return decrypted;
    } catch (error) {
        throw new Error(`Decryption failed: ${error.message}`);
    }
};

module.exports = {
    encrypt,
    decrypt
};
