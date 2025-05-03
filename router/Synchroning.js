const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
require('dotenv').config();
const secret = process.env.SECRET;
const { getSession, createSession } = require('../services/sessionManager');


const serverECDH = crypto.createECDH('prime256v1');
serverECDH.generateKeys();

const serverPublicKey = serverECDH.getPublicKey('base64');

// const sharedSecrets = new Map();


router.post('/init', (req, res) => {
    const { clientPublicKey, clientID } = req.body;
  
    if (!clientPublicKey) return res.status(400).json({ error: 'Client public key is required' });

    if (!clientID) {
      return res.status(400).json({ error: 'Client ID is required' });
    }
    // Serveur génère ses clés ECC
    const serverECDH = crypto.createECDH('prime256v1');
    serverECDH.generateKeys();

    console.log(`Initialisation de la session pour le client: ${clientID}`);

    console.log('la cle publique du client:',clientPublicKey);
  
    // Conversion et calcul du secret
    const clientKeyBuffer = Buffer.from(clientPublicKey, 'base64');
    const sharedSecret = serverECDH.computeSecret(clientKeyBuffer);
  
    console.log('la cle partager est :');
    console.log(sharedSecret.toString('hex'));
    // Dérive une clé AES
    // const aesKey = crypto.createHash('sha256').update(sharedSecret).digest();
    createSession(clientID, {
      aesKey: sharedSecret.toString('hex'),
      createdAt: Date.now(),
    });

    const payload = {
      client: {
        id: clientID,
        aesKey: sharedSecret.toString('hex'),
        createdAt: Date.now()
        
      },
    };
    // Token de session
    const token = jwt.sign(payload, secret, { expiresIn: "1d" });
    
  
    return res.json({
      serverPublicKey: serverECDH.getPublicKey('base64'),
      token,
      client: payload.client,
      expiresIn: 600
    });
  });


router.post('/send-encrypted', (req, res) => {
    const { token, iv, encrypted, tag } = req.body;
  
    const session = sharedSecrets.get(token);
    if (!session) return res.status(403).json({ error: 'Invalid session token' });
  
    const key = Buffer.from(session.aesKey, 'hex');
  
    try {
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
      decipher.setAuthTag(Buffer.from(tag, 'base64'));
  
      let decrypted = decipher.update(Buffer.from(encrypted, 'base64'), null, 'utf8');
      decrypted += decipher.final('utf8');
  
      return res.json({ decrypted });
    } catch (e) {
      return res.status(500).json({ error: 'Decryption failed', detail: e.message });
    }
  });

  router.post('/certificate', async(req,res)=>{
    
    const clientID = req.body.clientID;
    const iv = Buffer.from(req.body.iv, 'base64');
    const encryptedData = Buffer.from(req.body.encryptedData,'base64');
    const session = getSession(clientID);
    
    try { // fichier .pem
    

      // console.log(session);
      if (!session) return res.status(403).json({ error: 'Invalid session token' });

        const key = Buffer.from(session.aesKey, 'hex');
        
        if (!encryptedData || !iv) {
          return res.status(400).json({ error: "Données chiffrées ou IV manquants." });
        }


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

    const certInfo = JSON.parse(decrypted);
    console.log(certInfo); 

    // 🔍 Vérifications
    const { commonName, organizationName, countryName,organizationalUnitName } = certInfo.issuer;
    const { notBefore, notAfter, serialNumber,publicKeyPem } = certInfo;

    const now = new Date();
    const fromDate = new Date(notBefore);
    const toDate = new Date(notAfter);

    if (now < fromDate || now > toDate) {
      return res.status(400).json({ error: "Certificat expiré ou non encore valide." });
    }

    const allowedCountries = ['CM', 'FR', 'US'];
    if (!allowedCountries.includes(countryName)) {
      return res.status(403).json({ error: `Pays non autorisé : ${countryName}` });
    }

    console.log("✅ Certificat déchiffré et valide");
    console.log("CN :", commonName);
    console.log("Organisation :", organizationName);
    console.log("Unit Name :", organizationalUnitName);
    console.log("Pays :", countryName);
    console.log("Valide du :", notBefore, "au", notAfter);
    console.log("Publick Key :", publicKeyPem);

    return res.status(200).json({
      message: "Certificat valide",
      certificateInfo: certInfo
    });

    } catch (err) {
        console.error("Erreur lors du traitement :", err);
        return res.status(500).json({ error: "Erreur interne." });
    }
  })
  
module.exports = router;