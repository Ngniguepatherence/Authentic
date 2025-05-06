const crypto = require('crypto');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// Fonction pour générer une clé à partir du mot de passe
function generateKey(password) {
  return crypto.createHash('sha256').update(password).digest();
}

// Fonction pour déchiffrer les données
function decryptData(encryptedData, iv,sharedSecrets) {
  try {
    const key = Buffer.from(sharedSecrets, 'hex');
        // 🔓 Déchiffrement AES-256-CBC
        const decipher = crypto.createDecipheriv(
          'aes-256-gcm',
          key.slice(0,32),
          iv
        );
        decipher.setAuthTag(encryptedData.slice(-16));
        const cipherText = encryptedData.slice(0,-16);

        const decrypted = Buffer.concat([decipher.update(cipherText), decipher.final()])
        console.log(decrypted);
    
        const certInfo = decrypted;
        console.log(certInfo); 
    
    return certInfo;
  } catch (error) {
    console.error('Erreur lors du déchiffrement:', error);
    throw error;
  }
}

const calculateFileHash = (filePath) => {
  return new Promise((resolve, reject) => {
    const hashStream = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    
    stream.on('error', err => reject(err));
    stream.on('data', chunk => hashStream.update(chunk));
    stream.on('end', () => resolve(hashStream.digest('hex')));
  });
};


module.exports = {decryptData, generateKey, calculateFileHash}