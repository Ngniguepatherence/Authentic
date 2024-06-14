const express = require('express');
const UserController = require('../controller/UserController');
const router = express.Router();


router.post('/register',UserController.register);
router.get('/profile/:userId', UserController.profile);

module.exports = router;