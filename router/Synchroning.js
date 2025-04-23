const crypto = require('crypto');
const express = require('express');
const router = express.Router();

const serverECDH = crypto.createECDH('prime256v1');
serverECDH.generateKeys();

const serverPublicKey = serverECDH.getPublicKey('base64');

const sharedSecrets = new Map();


router.post('/init', (req, res) => {
    const { clientPublicKey } = req.body;
  
    if (!clientPublicKey) return res.status(400).json({ error: 'Client public key is required' });
  
    // Serveur génère ses clés ECC
    const serverECDH = crypto.createECDH('prime256v1');
    serverECDH.generateKeys();

    console.log('la cle publique du client:',clientPublicKey);
  
    // Conversion et calcul du secret
    const clientKeyBuffer = Buffer.from(clientPublicKey, 'base64');
    const sharedSecret = serverECDH.computeSecret(clientKeyBuffer);
  
    // Dérive une clé AES
    const aesKey = crypto.createHash('sha256').update(sharedSecret).digest();

    console.log('la cle partager est :');
    console.log(aesKey);
  
    // Token de session
    const token = crypto.randomBytes(32).toString('hex');
  
    sharedSecrets.set(token, {
      aesKey: aesKey.toString('hex'),
      createdAt: Date.now()
    });
  
    return res.json({
      serverPublicKey: serverECDH.getPublicKey('base64'),
      token,
      expiresIn: 600
    });
  });


router.post('/certificate', async (req,res)=>{
  const { encryptedCertificate, encryptedPassword, iv } = req.body;
  
  try {
    // Affichage des données chiffrées dans les logs
    console.log("📦 Certificat chiffré :", encryptedCertificate);
    console.log("🔐 Mot de passe chiffré :", encryptedPassword);
    console.log("🔁 IV (Initialization Vector) :", iv);

    // Ici, tu peux ajouter une logique pour déchiffrer ou manipuler les données
    // Exemple : Ajouter un mécanisme de stockage ou de déchiffrement si nécessaire

    // Réponse de confirmation
    res.json({ message: "Données chiffrées reçues avec succès" });
  } catch (err) {
    console.error("❌ Erreur lors du traitement des données chiffrées :", err);
    res.status(500).send("Erreur serveur");
  }
})

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
  
module.exports = router;