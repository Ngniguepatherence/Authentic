const Institution = require('../models/Institutions');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const auth = require('../middleware/auth');
const User = require('../models/User');
const { ObjectId } = require('mongodb');
const { getSession } = require('../services/sessionManager');
const { sendLoginInfoMail, sendConfirmationEmail, sendConfirmationEmailPersonnel } = require('../utils/sendEmail');
const { decryptData } = require('../utils/functions');
const crypto = require('crypto');

const secret = process.env.SECRET;


const UserController = {

  register: async (req, res) => {
    console.log('🔐 Début du processus register...');
    const { encryptedData, iv, encryptedFormData, encryptedFormIv, clientID } = req.body;

    try {
      const session = getSession(clientID);
      if (!session) {
        return res.status(401).json({ msg: "Session invalide ou expirée" });
      }

      // Déchiffrer le certificat
      const ivBuffer = Buffer.from(iv, 'base64');
      const encryptedDataBuffer = Buffer.from(encryptedData, 'base64');
      const decryptedCertData = decryptData(encryptedDataBuffer, ivBuffer, session.aesKey);
      const certData = JSON.parse(decryptedCertData);
      console.log("✅ Certificat déchiffré:", certData);

      // Déchiffrer les données du formulaire
      const ivFormBuffer = Buffer.from(encryptedFormIv, 'base64');
      const encryptedFormBuffer = Buffer.from(encryptedFormData, 'base64');
      const decryptedFormData = decryptData(encryptedFormBuffer, ivFormBuffer, session.aesKey);
      const formData = JSON.parse(decryptedFormData);
      console.log("✅ Données du formulaire déchiffrées:", formData);

      const { institutionId, fullName, email, telephone, function: userFunction, password, role } = formData;

      // Vérifier si l'utilisateur existe déjà
      let user = await User.findOne({ email: email });
      if (user) {
        return res.status(409).json({ msg: "Un utilisateur avec cet email existe déjà." });
      }

      // Vérifier si l'institution existe
      const institution = await Institution.findById(institutionId);
      if (!institution) {
        return res.status(404).json({ msg: "Institution introuvable." });
      }

      // Générer un token d'activation et un code de validation
      const activationToken = crypto.randomBytes(32).toString('hex');
      const validationCode = Math.floor(100000 + Math.random() * 900000).toString();

      // Créer l'utilisateur
      user = new User({
        institution: institution._id,
        name: fullName,
        email: email,
        phone: telephone,
        function: userFunction,
        password,
        role: role || 'USER',
        token: activationToken,
        code: validationCode,
        validation: false,
        createdAt: new Date()
      });

      // Hasher le mot de passe
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(user.password, salt);

      // Sauvegarder l'utilisateur
      await user.save();

      // Optionnel: envoyer un email d'activation ici (non implémenté)
      await sendConfirmationEmail(email, user.token, user.code);

      return res.status(201).json({
        msg: "Utilisateur enregistré avec succès. Veuillez activer votre compte.",
        token: activationToken,
        code: validationCode,
        email: user.email
      });

    } catch (err) {
      console.error("❌ Erreur dans registerOnw:", err);
      return res.status(500).json({ msg: "Erreur serveur." });
    }
  },

  registerPersonnel: async (req, res) => {
    console.log('🔐 Début du processus register...');

    const { formData, clientID } = req.body; // maintenant on attend directement les données claires

    try {
      // 🟢 Vérifier session
      const session = getSession(clientID);
      console.log(clientID);
      console.log(session);


      const {
        institutionId,
        fullName,
        email,
        telephone,
        function: userFunction,
        password,
        role,
        status
      } = formData; // données directement utilisées

      // 🟢 Vérifier email existant
      let user = await User.findOne({ email });
      if (user) {
        return res.status(409).json({ msg: "Un utilisateur avec cet email existe déjà." });
      }

      // 🟢 Vérifier institution
      const institution = await Institution.findById(institutionId);
      if (!institution) {
        return res.status(404).json({ msg: "Institution introuvable." });
      }

      // 🟢 Générer token + code validation
      const activationToken = crypto.randomBytes(32).toString('hex');
      const validationCode = Math.floor(100000 + Math.random() * 900000).toString();

      // 🟢 Créer utilisateur
      user = new User({
        institution: institution._id,
        name: fullName,
        email,
        phone: telephone,
        function: userFunction,
        password,
        role: role || 'USER',
        token: activationToken,
        code: validationCode,
        validation: false,
        createdAt: new Date()
      });

      // 🟢 Hasher mot de passe
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(user.password, salt);

      // 🟢 Sauver
      await user.save();

      // 🟢 Envoyer mail d'activation
      await sendConfirmationEmailPersonnel(email, user.token, user.code);

      return res.status(201).json({
        msg: "Utilisateur enregistré avec succès. Veuillez activer votre compte.",
        token: activationToken,
        code: validationCode,
        email: user.email
      });

    } catch (err) {
      console.error("❌ Erreur dans registerPersonnel:", err);
      return res.status(500).json({ msg: "Erreur serveur." });
    }
  },



  getUserFromToken: async (req, res) => {
    try {
      const { token, code } = req.body;
      console.log(token);
      console.log(req.body);


      if (!token) {
        return res.status(400).json({ msg: "Token requis pour activer le compte." });
      }




      // Trouver l'utilisateur par token OU code
      const user = await User.findOne({
        $or: [{ token: token }]
      });

      console.log(user);


      if (!user) {
        return res.status(201).json({ msg: "Utilisateur non trouvé ou lien/code invalide." });
      }


      if (user.validation) {
        return res.status(201).json({ msg: "Deja valider compte." });
      }


      console.log(user.validation === true);


      // // Activer le compte
      // user.validation = true;
      // user.token = null; // on supprime le token pour éviter réutilisation
      // user.code = null;  // même chose pour le code

      await user.save();
      user.password = ''
      //  user.code = ''
      //user.token = ''

      return res.status(200).json({ msg: "Compte en cours d'activé ", user: user });

    } catch (err) {
      console.error("❌ Erreur dans get token user:", err);
      return res.status(500).json({ msg: "Erreur serveur." });
    }
  },

  activateAccount: async (req, res) => {
    try {
      const { token, code } = req.body;

      if (!token && !code) {
        return res.status(401).json({ msg: "Token ou code requis pour activer le compte." });
      }



      // Trouver l'utilisateur par token OU code
      const user = await User.findOne({
        $or: [{ token: token }, { code: code }]
      });

      if (!user) {
        return res.status(404).json({ msg: "Utilisateur non trouvé ou lien/code invalide." });
      }

      if (user.validation === true) {
        return res.status(400).json({ msg: "Le compte est déjà activé." });
      }

      // Activer le compte
      user.validation = true;
      user.token = null; // on supprime le token pour éviter réutilisation
      user.code = null;  // même chose pour le code

      await user.save();

      return res.status(200).json({ msg: "Compte activé avec succès." });

    } catch (err) {
      console.error("❌ Erreur dans activateAccount:", err);
      return res.status(500).json({ msg: "Erreur serveur." });
    }
  },

  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      // Vérifier si l'email et le mot de passe sont fournis
      if (!email || !password) {
        return res.status(400).json({ msg: "Email et mot de passe requis." });
      }

      // Chercher l'utilisateur
      const user = await User.findOne({ email: email });

      if (!user) {
        return res.status(404).json({ msg: "Email ou mot de passe invalid." });
      }

      console.log(user);
      user.code = ''


      // Vérifier le mot de passe
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ msg: "Email ou mot de passe invalid." });
      }


      // Vérifier si le compte est activé
      if (!user.validation) {
        if (user.role === "OWN") {
          return res.status(403).json({
            msg: "Le compte n'est pas activé. Veuillez vérifier votre email et cliquer sur le lien d'activation.",
            role: "OWN"
          });
        } else {
          return res.status(403).json({
            msg: "Le compte n'est pas activé. Veuillez entrer le code secret envoyé à votre email.",
            role: "USER"
          });
        }
      }

      // Supprimer les infos sensibles avant de renvoyer l'utilisateur
      // const { password: _, token, code, ...userWithoutSensitive } = user.toObject();

      // return res.status(200).json({
      //   msg: "Connexion réussie.",
      //   user: userWithoutSensitive,
      //   token: token,
      // });
      // ✅ GÉNÉRER LE TOKEN
      const payload = { user: { id: user._id } }; // on inclut l'id de l'utilisateur
      const token = jwt.sign(payload, secret, { expiresIn: '1h' }); // token valide 1h

      // Retirer les champs sensibles avant de renvoyer
      const { password: _, code, ...userWithoutSensitive } = user.toObject();

      console.log('✅ login-token',token);
      
      //  Renvoyer le token et l'utilisateur
      return res.status(200).json({
        msg: "Connexion réussie.",
        user: userWithoutSensitive,
        token: token, // ici on renvoie le token
        role: user.role, // Renvoyer le rôle

      });

    } catch (err) {
      console.error("❌ Erreur dans login:", err);
      return res.status(500).json({ msg: "Erreur serveur." });
    }
  },
  getCurrentUser: async(req, res) => {
    try {

            
      if (!req.user) {
        return res.status(401).json({ msg: "Utilisateur non authentifié." });
      }
  
      const userId = req.user.id; // car dans ton middleware: req.user = decoded.user
      const user = await User.findById(userId).select('-password -code');
  
      if (!user) {
        return res.status(401).json({ msg: "Utilisateur introuvable." });
      }

    //  console.log(user);
  
      return res.status(200).json(user);
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: "Erreur serveur." });
    }
  },

  reSendCode: async (req, res) => {
    try {
      const { email } = req.body;
      console.log("Send Code", email);

      // Vérifier si l'email est fourni
      if (!email) {
        return res.status(400).json({ success: false, message: "Email requis." });
      }

      // Chercher l'utilisateur dans la base
      const user = await User.findOne({ email });

      if (!user) {
        return res.status(404).json({ success: false, message: "Aucun utilisateur trouvé avec cet email." });
      }

      // Générer un code aléatoire à 6 chiffres
      const code = Math.floor(100000 + Math.random() * 900000).toString();

      // Sauvegarder le code dans user.code
      user.code = code;

      await user.save();

      // Envoyer l'email
      await sendConfirmationEmail(user.email, code);

      // Répondre succès
      return res.json({ success: true, message: "Code renvoyé avec succès." });

    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Erreur interne du serveur." });
    }
  },


  activateWithCode: async (req, res) => {

    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ msg: "Email et code requis." });
    }

    const user = await User.findOne({ email, code });

    if (!user) {
      return res.status(404).json({ msg: "Utilisateur non trouvé ou code invalide." });
    }

    user.validation = true;
    user.code = null; // Optionnel: supprimer le code après activation
    user.token = null
    await user.save();

    return res.json({ msg: "Compte activé avec succès." });
  },

  profile: async (req, res) => {
    try {
      const userId = req.body;

      // Find the user by their ID
      const user = await User.findById(userId).populate('institution');

      if (!user) {
        return res.status(404).json({ msg: 'User not found' });
      }

      res.json(user);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  },

  getUserByID: async (req, res) => {
    try {
      // Récupérer l'ID depuis les paramètres de la requête
      const userId = req.params.id;
  
      // Vérifier si l'ID est fourni
      if (!userId) {
        return res.status(400).json({ msg: "ID utilisateur requis." });
      }
  
      // Rechercher l'utilisateur, exclure les champs sensibles
      const user = await User.findById(userId).select('-password -code');
  
      if (!user) {
        return res.status(404).json({ msg: "Utilisateur introuvable." });
      }
  
      return res.status(200).json(user);
    } catch (err) {
      console.error("Erreur lors de la récupération de l'utilisateur:", err);
      return res.status(500).json({ msg: "Erreur serveur." });
    }
  }
};

module.exports = UserController;