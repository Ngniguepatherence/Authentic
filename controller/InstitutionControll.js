const Institution = require('../models/Institutions');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const crypto = require('crypto');
const User = require('../models/User');
const {decryptData} = require('../utils/functions');
const { sendLoginInfoMail, sendConfirmationEmail } = require('../utils/sendEmail');
const { getSession } = require('../services/sessionManager');
const Admin = require('../models/Admin');

const secret = process.env.SECRET;


const InstitutionController = {
    register: async (req,res) => {
        const {name, address,bp,tel,email,headerName,website,password} = req.body;
        try {
            let institution = await Institution.findOne({email});
            if (institution) {
                return res.status(400).json({msg: 'Institution already exists'});
            }

            const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
                namedCurve: 'secp256k1', // Utilisation de la courbe elliptique secp256k1
                publicKeyEncoding: { type: 'spki', format: 'pem' },
                privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
              });
            institution = new Institution({
                name: name, 
                address: address,
                boitepostal: bp,
                tel:tel,
                email: email,
                headerName: headerName,
                publicKey: publicKey,
                privateKey: privateKey,
                website: website,
                password:password,

            });
            const salt = await bcrypt.genSalt(10);
            institution.password = await bcrypt.hash(req.body.password,salt);
            await institution.save();
            
            const payload = { user: {id: institution.id, type: 'institution'}};
            jwt.sign(payload,secret, {expiresIn: 360000 }, (err,token) => {
                if(err) throw err;
                res.json({token});
            });
        }catch(err) {
            console.error(err.message);
            res.status(500).send('Server error');
        }
    },

    deleteInstitution: async (req, res) => {
        const institutionId  = req.body;
  
        try {
            let deletedInstitution = await Institution.findByIdAndDelete(institutionId);
  
            if (!deletedInstitution) {
                return res.status(404).json({ msg: 'Institution not found' });
             }
  
            res.json({ msg: 'Institution deleted successfully' });
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server error');
        }
    },

  loginWithCertificate: async (req, res) => {
    
        const clientID = req.body.clientID;
        // const iv = Buffer.from(req.body.iv, 'base64');
        // const encryptedData = Buffer.from(req.body.encryptedData,'base64');
        // const session = getSession(clientID);
          const data = req.body.encryptedData;
      
          try {
            // console.log(session);
            // if (!session) return res.status(403).json({ error: 'Invalid session token' });
            
            // if (!encryptedData || !iv) {
            //   return res.status(400).json({ error: "Données chiffrées ou IV manquants." });
            // }
            // console.log(encryptedData);
            // const data = decryptData(encryptedData,iv,session.aesKey);
            console.log(data)
            
        
        // 🔍 Vérifications
          const { countryName,organizationName,organizationalUnitName,commonName  } = data.issuer;
          const { notBefore, notAfter, serialNumber,publicKeyPem, fingerprintSHA256 } = data;

          const now = new Date();
          const fromDate = new Date(notBefore);
          const toDate = new Date(notAfter);

          if (now < fromDate || now > toDate) {
            return res.status(400).json({ error: "Certificat expiré ou non encore valide." });
          }

          const allowedCountries = ['CM'];
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

      
            // Gérer la connexion d'une institution + user
            const institution = await Institution.findOne({ name: organizationName });
            if (!institution) {
              return res.status(404).json({ message: "Institution non reconnue." });
            }
      
            const payload = {
              user: {
                id: institution._id,
                name: institution.name,
                institution: institution.address,
              },
            };
      
            const token = jwt.sign(payload, process.env.SECRET, { expiresIn: "7d" });
            console.log(`organisation ${organizationName} connectes en tant que Admin a la platforme avec success!`)
            res.json({ token, user: payload.user });
          
        } catch (err) {
          console.error(err);
          res.status(500).json({ message: "Erreur serveur" });
        }
      },

      registerwithCertificate: async (req, res) => {
        console.log('registering starting...');
        const { encryptedData, iv, clientID, encryptedFormData, encryptedFormIv } = req.body;
        try {
            const session = getSession(clientID);
    
            const ivB = Buffer.from(iv, 'base64');
            const encryptedDataB = Buffer.from(encryptedData, 'base64');
            console.log('log data',encryptedData);
            console.log('log session:', session);
            
            const datas = decryptData(encryptedDataB, ivB, session.aesKey);
            const data = JSON.parse(datas);
    
            console.log("✅ Données du certificat déchiffrées:", data);
    
            const encryptedDataFormB = Buffer.from(encryptedFormData, 'base64');
            const ivFormB = Buffer.from(encryptedFormIv, 'base64');
            const formDatas = decryptData(encryptedDataFormB, ivFormB, session.aesKey);
            const formData = JSON.parse(formDatas);
    
            console.log("✅ Données du formulaire déchiffrées:", formData);
    
            // --- Vérifications du certificat
            const { countryName, organizationName, organizationalUnitName, commonName } = data.issuer;
            const { notBefore, notAfter, serialNumber, publicKeyPem, fingerprintSHA256 } = data;
    
            const now = new Date();
            const fromDate = new Date(notBefore);
            const toDate = new Date(notAfter);
    
            if (now < fromDate || now > toDate) {
                return res.status(400).json({ error: "Certificat expiré ou non encore valide." });
            }
    
            const allowedCountries = ['CM'];
            if (!allowedCountries.includes(countryName)) {
                return res.status(403).json({ error: `Pays non autorisé : ${countryName}` });
            }
    
            console.log("✅ Certificat valide:", { commonName, organizationName, countryName });
    
            const { institutionName, location, website, address, description, email, telephone } = formData;
    
            // ✅ Vérifier si l'email existe déjà
            let institution = await Institution.findOne({ email });
            if (institution) {
                return res.status(409).json({  message: 'Institution email already exists' });
            }
    
            // ✅ Vérifier si le certificat existe déjà (par fingerprint ou serialNumber)
            let certExists = await Institution.findOne({
                $or: [
                    { "certificate.fingerprint": fingerprintSHA256 },
                    { "certificate.certificateRaw": serialNumber }
                ]
            });
            if (certExists) {
                return res.status(409).json({  message: 'Un certificat identique est déjà enregistré.' });
            }
    
            // ✅ Sinon, on crée l'institution
            const newInstitution = new Institution({
                name: institutionName,
                website,
                address,
                email,
                phone: telephone,
                description,
                location,
                certificate: {
                    commonName,
                    organization: organizationName,
                    organizationalUnit: organizationalUnitName,
                    country: countryName,
                    validFrom: notBefore,
                    validTo: notAfter,
                    publicKey: publicKeyPem,
                    fingerprint: fingerprintSHA256 || null,
                    certificateRaw: serialNumber || "",
                    verified: false
                },
                createdAt: new Date()
            });
    
            await newInstitution.save();
    
            const payload = { user: { id: newInstitution._id, type: 'institution' } };
           // await sendConfirmationEmail(email, newInstitution._id);
    
            jwt.sign(payload, secret, { expiresIn: 360000 }, (err, token) => {
                if (err) throw err;
                res.status(201).json({
                    message: "Institution enregistrée avec succès.",
                    institutionId: newInstitution._id,
                    token
                });
            });
    
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Server Error" });
        }
    },
    
    getInstitutionById: async(req,res)=>{
        try {
            const { institutionId } = req.params;
        
            // Chercher l'institution par son ID
            const institution = await Institution.findById(institutionId);
        
            if (!institution) {
              return res.status(404).json({ msg: 'Institution introuvable.' });
            }
        
            // Retourner l'institution
            return res.status(200).json(institution);
        
          } catch (err) {
            console.error('Erreur lors de la récupération de l\'institution :', err);
            return res.status(500).json({ msg: 'Erreur serveur.' });
          }
    },
    
    
    login: async(req,res) => {
        const { email, password, certificateInfo } = req.body;
        try {
            // Rechercher l'utilisateur dans les deux collections
            let institution = await Institution.findOne({ email });
            let user = await User.findOne({ email });
            let entity = institution || user;
            let entityType = institution ? 'institution' : 'user';

            if (!entity) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
            }

            const isMatch = await bcrypt.compare(password, entity.password);
            if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
            }

            const payload = {
            user: {
                id: entity.id,
                type: entityType,
                name: entity.name, // Ajoutez d'autres informations nécessaires
            },
            };

            jwt.sign(payload, secret, { expiresIn: 360000 }, (err, token) => {
            if (err) throw err;
            res.json({ token, user: payload.user });
            });
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server error');
        }
    },
    loginUser: async(req,res) => {
        const { email, password} = req.body;
        try {
            let institution = await Institution.findOne({email});
            if(!institution) {
                return res.status(400).json({msg: 'Invalid Credentials'});
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if(!isMatch){
                return res.status(400).json({msg: 'Invalid Credentials'});
            }
            const payload = { user: { id: user.id, type: 'user'}};
            jwt.sign(payload, secret, {expiresIn: 360000 }, (err, token) => {
                if(err) throw err;
                res.json({token});
            });
        }
        catch(err) {
            console.error(err.message);
            res.status(500).send('Server error');
        }
    },

    logout: async (req, res) => {
        try {
          req.session.destroy();
      
          res.json({ msg: 'Logout successful' });
        } catch (err) {
          console.error(err.message);
          res.status(500).send('Server error');
        }
      },

      registerUser: async (req, res) => {
        try {
        
          const token = req.headers['authorization']?.split(' ')[1];
          
          const { name, email,fonction, password, role, tel,status } = req.body;
  
          if(!token) return res.status(401).json({ message: 'Token manquant'});

            let user = await User.findOne({ email });
            if (user) {
                return res.status(400).json({ msg: "User already exists" });
            }
            // Verify and decode 
            let decoded;
            try {
              decoded = jwt.verify(token, process.env.SECRET);
            
            } catch(err) {
              return res.status(401).json({ message : 'Token invalide ou expire'});
            }
            const {organisationId} = decoded;

            const institution = await Institution.findById(organisationId);
            if (!institution) {
                return res.status(400).json({ msg: 'Institution not found' });
            }
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            console.log(institution.name);

            user = new User({
                institution: institution.id,
                name: name,
                email: email,
                role: role,
                status: status,
                password :hashedPassword,
                occupation: fonction,
                telephone: tel
                
            });

            await user.save();
            res.status(200).json(user);
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server error');
        }
    },
      registerAdminOrg: async (req, res) => {
        try {
        
          const token = req.headers['authorization']?.split(' ')[1];
          
          const { name, email, password, role, tel } = req.body;
  
          if(!token) return res.status(401).json({ message: 'Token manquant'});

            let user = await Admin.findOne({ email });
            if (user) {
                return res.status(400).json({ msg: "User already exists" });
            }
            // Verify and decode 
            let decoded;
            try {
              decoded = jwt.verify(token, process.env.SECRET);
            
            } catch(err) {
              return res.status(401).json({ message : 'Token invalide ou expire'});
            }
            const {organisationId} = decoded;

            const institution = await Institution.findById(organisationId);
            if (!institution) {
                return res.status(400).json({ msg: 'Institution not found' });
            }
            const existingAdmin = await Admin.findOne({ institution: organisationId});
            if(existingAdmin) {
              return res.status(400).json({ message: 'Un administrateur existe deja pour cette organisation'});
            }
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            console.log(institution.name);

            user = new Admin({
                institution: institution.id,
                name: name,
                email: email,
                password :hashedPassword,
                occupation: role,
                telephone: tel
                
            });

            await user.save();
            institution.adminRegistered = true;
            institution.status = "validated";
            await institution.save();
            res.status(200).json(user);
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server error');
        }
    },
   getUsersByInstitution : async (req, res) => {
        try {
            // Extraire l'ID de l'institution de la requête
           
    
            // Vérifier si l'institution existe
            const institution = await Institution.findById(req.user.id);

            if (!institution) {
                return res.status(404).json({ msg: 'Institution not found' });
            }
    
            // Trouver les utilisateurs associés à cette institution
            const users = await User.find({ institution:req.user.id}).select('email createdAt name role');
    
            // Retourner la liste des utilisateurs
            res.json(users); 
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server error');
        }
    },
        getInstitution: async(req,res) => {
        try{
            const institutions = await Institution.find();
            res.json(institutions);
        }
        catch(err) {
            res.status(500).send('Server error');
        }
    },
    getInstitutionId: async (req, res) => {
        try {
            const { id } = req.params;

            console.log('++++++++++++++++++..................', id);
            
            const institution = await Institution.findById(id).lean();
    
            if (!institution) {
                return res.status(404).send('Institution not found...');
            }
    
            delete institution.publicKey;
            delete institution.privateKey;
            delete institution.password;
            delete institution.certificate;
    
            res.json(institution);
        } catch (err) {
            res.status(500).send('Error getting institution');
        }
    },
    
    logout: async(req,res) => {
         // Effacer le cookie ou le localStorage
    res.clearCookie('jwt'); // Si vous utilisez des cookies
    // Ou
    res.clearCookie('token', { path: '/' }); // Si vous utilisez des cookies avec un chemin spécifique
    // Ou
    localStorage.removeItem('token'); // Si vous utilisez localStorage

    res.json({ msg: 'Logged out successfully' });   
    }
};

module.exports = InstitutionController;