const express = require('express');
const router = express.Router();
const Institution = require('../controller/InstitutionControll');
const auth = require('../middleware/auth');

//

router.post('/register',Institution.register);
router.post('/login',Institution.login);
router.post('/loginCertificate',Institution.loginWithCertificate);
router.post('/registerOwner', auth, Institution.registerAdminOrg);

router.post('/registerCertificate',  Institution.registerwithCertificate);
router.post('/user-by-institution', auth, Institution.getUsersByInstitution );

router.post('/delete/',auth, Institution.deleteInstitution);
router.get('/institutions',auth,Institution.getInstitution);

router.post('/logout',auth,Institution.logout);///get/:institutionId
//router.get('/institutions/get/:id',auth,Institution.getInstitutionId);
router.get('/institution/get', Institution.getInstitutionById);

module.exports = router;