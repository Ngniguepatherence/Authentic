const express = require('express');
const UserController = require('../controller/UserController');
const router = express.Router();


router.post('/register',UserController);

module.exports = router;