const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../middleware/auth');
const DocumentC = require('../controller/DocumentControll');


const upload = multer({dest:'uploads/'});

router.post('/sign', auth,upload.single('file'),DocumentC.SignDocument);
router.post('/signfile', auth,upload.single('file'),DocumentC.signFile);
router.post('/signqr', auth,upload.single('file'),DocumentC.signPdfAndQR);

router.post('/verify',upload.single('file'), DocumentC.VerifyFile);
router.post('/verifyqr',upload.single('file'), DocumentC.verifyPdfWithQRCode);

router.get('/documents',auth,DocumentC.getDocuments);
module.exports = router;