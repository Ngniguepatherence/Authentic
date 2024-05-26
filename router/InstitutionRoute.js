const express = require('express');
const router = express.Router();
const Institution = require('../controller/InstitutionControll');
const auth = require('../middleware/auth');

router.post('/register',Institution.register);
router.post('/login',Institution.login);
router.post('/register_user', auth, Institution.registerUser);
router.post('/delete/', Institution.deleteInstitution);

module.exports = router;