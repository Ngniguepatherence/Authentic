const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const auth = require('../middleware/auth');
const DocumentC = require('../controller/DocumentControll');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(__dirname, '../uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      // Create unique filename
      const uniqueFilename = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
      cb(null, uniqueFilename);
    },
  });

  const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  };
  
  const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // Limit to 10MB
  });

router.post('/sign', auth,upload.single('file'),DocumentC.SignDocument);
router.post('/signfile', auth,upload.single('file'),DocumentC.signFile);
router.post('/signqr', auth,upload.single('file'),DocumentC.signPdfAndQR);
router.post('/upload',upload.single('file'),DocumentC.QrCode);
router.post('/verify',upload.single('file'), DocumentC.VerifyFile);
router.post('/verifypdf',upload.single('document'), DocumentC.VerifyPdf);
router.post('/verif',upload.single('file'), DocumentC.verification);

router.post('/verifyqr',upload.single('file'), DocumentC.verifyPdfWithQRCode);

router.get('/documents',auth,DocumentC.getDocuments);
module.exports = router;

// routes/document.routes.js
// const express = require('express');
// const { 
//     const router = express.Router();
//   uploadDocument, 
//   getDocuments, 
//   getDocument, 
//   updateQRPosition, 
//   deleteDocument 
// } = require('../controllers/document.controller');
// const { protect, authorize } = require('../middleware/auth.middleware');
// const { upload } = require('../middleware/upload.middleware');

// // Routes pour les documents
// router.post('/', protect, upload.single('file'), uploadDocument);
// router.get('/', protect, getDocuments);
// router.get('/:id', protect, getDocument);
// router.put('/:id/position', protect, updateQRPosition);
// router.delete('/:id', protect, deleteDocument);

// module.exports = router;

// // routes/auth.routes.js
// const express = require('express');
// const {
//   register,
//   login,
//   getMe,
//   logout
// } = require('../controllers/auth.controller');
// const { protect } = require('../middleware/auth.middleware');

// router.post('/register', register);
// router.post('/login', login);
// router.get('/me', protect, getMe);
// router.post('/logout', protect, logout);

// module.exports = router;

// // routes/qr.routes.js
// const express = require('express');
// const router = express.Router();
// const {
//   addQRContent,
//   verifyDocument,
//   generateSignedDocument
// } = require('../controllers/qr.controller');
// const { protect } = require('../middleware/auth.middleware');

// router.post('/:documentId/content', protect, addQRContent);
// router.post('/:documentId/verify', verifyDocument);
// router.post('/:documentId/sign', protect, generateSignedDocument);

// module.exports = router;