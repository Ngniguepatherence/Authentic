const express = require('express');
const UserController = require('../controller/UserController');
const router = express.Router();

///resend-code
router.post('/register',UserController.register);
router.get('/profile/:userId', UserController.profile);
router.post('/activate', UserController.activateAccount); //getUserFromToken
router.post('/get/from/token', UserController.getUserFromToken); // /api/user/personnel activate
router.post('/personnel',UserController.registerPersonnel);
router.post('/login',UserController.login);
router.post('/resend-code',UserController.reSendCode);
router.post('/activate-code',UserController.activateWithCode);
router.get('/me',UserController.getCurrentUser);

module.exports = router;