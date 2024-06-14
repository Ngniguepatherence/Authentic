const express = require('express');
const router = express.Router();
const Institution = require('../controller/InstitutionControll');
const auth = require('../middleware/auth');

//

router.post('/register',Institution.register);
router.post('/login',Institution.login);
router.post('/register_user', auth, Institution.registerUser);
router.post('/user-by-institution', auth, Institution.getUsersByInstitution );

router.post('/delete/',auth, Institution.deleteInstitution);
router.get('/institutions',auth,Institution.getInstitution);
router.get('/institution/:id',auth,Institution.getInstitutionId);
router.post('/logout',auth,Institution.logout);

module.exports = router;