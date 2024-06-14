const Institution = require('../models/Institutions');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const crypto = require('crypto');
const User = require('../models/User');

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

    login: async(req,res) => {
        const { email, password } = req.body;
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
        console.log(req.body.name);
        console.log(req.body);

        const { name, email, password, role } = req.body;
  
        console.log(name);

        try {
            let user = await User.findOne({ email });
            if (user) {
                return res.status(400).json({ msg: "User already exists" });
            }
            const institution = await Institution.findById(req.user.id);
            if (!institution) {
                return res.status(400).json({ msg: 'Institution not found' });
            }
            const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
                namedCurve: 'secp256k1', // Using the elliptic curve secp256k1
                publicKeyEncoding: { type: 'spki', format: 'pem' },
                privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
            });

            console.log(institution.name);

            user = new User({
                institution: institution.id,
                name,
                email,
                publicKey: publicKey,
                privateKey: privateKey,
                password,
                role
            });

           // console.log(user);
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);

            await user.save();
            res.json(user);
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
    getInstitutionId: async(req,res) => {
        try{
            const {id} = req.params;
            const institution = await Institution.findById(id);
              
            institution.publicKey = ""
            institution.password = ""
            institution.privateKey = ''

            res.json(institution);
        }catch(err) {
            res.status(500).send('Error during geting institution');
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