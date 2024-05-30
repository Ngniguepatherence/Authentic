const Institution = require('../models/Institutions');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const auth = require('../middleware/auth');
const  Admin = require('../models/Admin');

const secret = process.env.SECRET;


const UserController = {
    register: async(req,res) => {
        const {name,tel, email,password} = req.body;

        try{
            let admin = await Admin.findOne({email});
            if(admin){
                return res.status(400).json({msg: "Admin already exits"});
            }
            

            admin = new Admin({name,tel,email});
            const salt = await bcrypt.genSalt(10);
            admin.password = await bcrypt.hash(password, salt);

            await admin.save();
            res.json(admin);
        }catch(err) {
            console.error(err.message);
            res.status(500).send('Server error');
        }
    },

    login: async(req,res) => {
        const {email, password} = req.body;
        try {
            const admin = Admin.findOne({email});
            if(!admin) {
                return res.status(400).json({msg: 'Invalid Credentials'});
            }
            const isMatch = await bcrypt.compare(password, entity.password);
            if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
            }

            const payload = { user: { id: admin.id, name: admin.name}};
            jwt.sign(payload, secret, {expiresIn: 360000 }, (err, token) => {
                if(err) throw err;
                res.json({token,user});
            });

        }catch(err) {
            console.error(err.message);
            res.status(500).send('Server error');
        }
    }
};

module.exports = UserController;