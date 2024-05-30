const Institution = require('../models/Institutions');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const auth = require('../middleware/auth');
const  User = require('../models/User');
const { ObjectId } = require('mongodb');

const secret = process.env.SECRET;


const UserController = {
    register: async(req,res) => {
        const {fid, name, email,password,role} = req.body;
        try{
            let user = await User.findOne({email});
            if(user){
                return res.status(400).json({msg: "User already exits"});
            }
            const institution = await Institution.findById(fid);
            if(!institution){
                return res.status(400).json({msg: 'Institution not found'});
            }

            user = new User({ institution: institution.id, name,email,password, role});
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
            await user.save();

            res.json(user);
        }catch(err) {
            console.error(err.message);
            res.status(500).send('Server error');
        }
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
      }
};

module.exports = UserController;