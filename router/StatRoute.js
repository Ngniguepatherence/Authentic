const express = require('express');
const Stat = require('../controller/StatController');
const router = express.Router();
const auth = require('../middleware/auth');


router.get('/number/users',Stat.getTotalUsers);
router.get('/number/inst',Stat.getTotalInstitutions);
router.get('/number/docs',Stat.getTotalDocs);
router.get('/number/signedUser',Stat.getTotalDocs);

router.get('/number/users/institution/:id',Stat.getTotalUsersPerInstitution);

module.exports = router;