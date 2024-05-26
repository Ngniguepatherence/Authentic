const Institution = require('../models/Institutions');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const crypto = require('crypto');

const  User = require('../models/User');

const secret = process.env.SECRET;


const InstitutionController = {
    register: async (req,res) => {
        const {name, address,bp,tel,email,website,password} = req.body;
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

    login: async(req,res) => {
        const { email, password} = req.body;
        try {
            let institution = await Institution.findOne({email});
            if(!institution) {
                return res.status(400).json({msg: 'Invalid Credentials'});
            }

            const isMatch = await bcrypt.compare(password, institution.password);
            if(!isMatch){
                return res.status(400).json({msg: 'Invalid Credentials'});
            }
            const payload = { user: { id: institution.id, type: 'institution'}};
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
    registerUser: async(req,res) => {
        const {name, email,password,role} = req.body;

        try{
            let user = await User.findOne({email});
            if(user){
                return res.status(400).json({msg: "User already exits"});
            }
            const institution = await Institution.findById(req.user.id);
            if(!institution){
                return res.status(400).json({msg: 'Institution not found'});
            }
            const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
                namedCurve: 'secp256k1', // Utilisation de la courbe elliptique secp256k1
                publicKeyEncoding: { type: 'spki', format: 'pem' },
                privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
              });
            console.log(institution.name);

            user = new User({ institution: institution.id, name,email,publicKey: publicKey,privateKey: privateKey,password, role});
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);

            await user.save();
            res.json(user);
        }catch(err) {
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
            res.json(institution);
        }catch(err) {
            res.status(500).send('Error during geting institution');
        }
    },
    logout: async(req,res) => {
        
    }
};

module.exports = InstitutionController;