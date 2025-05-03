const express = require('express');
const router = express.Router();
const Institution = require('../models/Institutions');
const auth = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const sendEmail = require('../utils/sendEmail');


router.post('/institution/validate/:id', async(req,res) => {
    // try{

    const org = await Institution.findById(req.params.id);
    if (!org) return res.status(404).json({ error: "Organisation non trouvée." });

    org.status = "validated";
    org.validationToken = uuidv4(); // Nouveau token sécurisé
    await org.save();

    const link = `http://localhost:3000/tuto?token=${org.validationToken}`;

    await sendEmail({
        to: 'ngniguepaarmel1@gmail.com',
        subject: "Votre compte a été validé !",
        text: `Votre organisation est validée. Créez un compte personnel ici : ${link}`,
      });
      res.json({ message: "Organisation validée et email envoyé." });
    // } catch (e) {
    //   res.status(500).json({ error: "Erreur lors de la validation." });
    // }
})

module.exports = router;