const crypto = require('crypto');
const fs = require('fs');

// AES 256 encryption
const secretKey = crypto.randomBytes(32);  // 256-bit AES key
const iv = crypto.randomBytes(16);  // Initialization vector

function encryptData(data) {
    const cipher = crypto.createCipheriv('aes-256-cbc', secretKey, iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
}

// Encrypt a private key or any sensitive file (replace with your actual file path)
const privateKey = fs.readFileSync('C:/Users/Paul Wynn/github/wfsl-proofgate-cli/private.key', 'utf8');  // Replace this with the actual file path
const encryptedPrivateKey = encryptData(privateKey);

// Save encrypted key to a file
fs.writeFileSync('encrypted_private.key.b64', encryptedPrivateKey);
console.log('Encryption complete!');
