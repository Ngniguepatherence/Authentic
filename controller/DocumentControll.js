const crypto = require('crypto');
const Document = require('../models/document');
const Institution = require('../models/Institutions');
const User = require('../models/User');
const { PDFDocument} = require('pdf-lib');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const jsQR = require('jsqr');
const { createCanvas, loadImage } = require('canvas');
const { calculateFileHash } = require('../utils/functions');

const generatePdfWithQRCode = async (pdfBytes, qrCodeData) => {
  const pdfDoc = await PDFDocument.load(pdfBytes);

  // Générer et sauvegarder le code QR sous forme d'image
  const qrCodeImagePath = 'qr_code.png'; // Chemin où sauvegarder l'image
  await generateQRCodeImage(qrCodeData, qrCodeImagePath);

  // Charger l'image du code QR
  const qrCodeImageBytes = fs.readFileSync(qrCodeImagePath);

  // Récupérer la première page du PDF
  const firstPage = pdfDoc.getPages()[0];
  const { width: pageWidth, height: pageHeight } = firstPage.getSize();
  const qrCodeImageDims = 100; // Taille de l'image QR code

  // Intégrer l'image QR code en tête de page
  firstPage.drawImage(qrCodeImageBytes, {
    x: 50, // Définissez la position X selon vos besoins
    y: pageHeight - qrCodeImageDims - 50, // Définissez la position Y selon vos besoins
    width: qrCodeImageDims,
    height: qrCodeImageDims,
  });

  const modifiedPdfBytes = await pdfDoc.save();
  return modifiedPdfBytes;
};

const saveFile = async (fileBytes, filePath) => {
  return new Promise((resolve, rejects) => {
    fs.writeFile(filePath, fileBytes, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

const saveSignedFile = async (fileBytes, fileName) => {
  const filePath = `../uploads/${fileName}`; // Spécifiez le chemin où vous souhaitez enregistrer le fichier
  await saveFile(fileBytes, filePath);
  return filePath;
};

// Sign Document
const DocumentController = {
  uploadDocument: async(req,res) =>{
    try {
      const { title, path: filePath } = req.file;
      const { addedBy, type } = req.body;
      if(!title || !filePath) {
        return res.status(400).json({error: 'Titre ou chemin du fichier manquant'});
      }

      const doc = new Document({
        title,
        filePath,
        createdBy: req.user._id,
        institution: req.user.institution,
        history: [{
          action:'uploaded',
          actor: req.user._id,
          comment: 'Document initialement uploader'
        }]
      });
      await doc.save();
      return res.status(201).json(doc);
    }
    catch(err){
      console.error(err);
      return res.status(500).json({error: 'Erreur lors de l\'upload'});
    }
  },
  SignDocument: async (req, res) => {
    console.log(req.file);

      const content = req.file; 

        try {
            const institution = await Institution.findById(req.user.id);
            if(!institution) {
                return res.status(400).json({msg: 'Institution not found'});
            }

            const sign = crypto.createSign('SHA256');
            sign.update(content);
            sign.end();

            const signature = sign.sign(institution.privateKey, 'hex');

            const document = new Document({
                institution: institution.id,
                StaffName: institution.headerName,
                fileType: 'pdf',
                content,
                signature
            });
            await document.save();

            res.json(document);

        }catch(err) {
            console.error(err.message);
            res.status(500).send('Error during Signing of Data');
        }
    },
    getDocuments: async(req,res) => {
        try {
            const documents = await Document.find({institution: req.user.id});
            res.json(documents);
        }catch(err) {
            console.error(err.message);
            res.status(500).send('Server error');
        }
    },
    // Sign a pdf file
  

  getDocuments: async (req, res) => {
    try {
      const documents = await Document.find({ institution: req.user.id }) .select('StaffName fileType  signature createdAt location title');

      res.json(documents);

    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    } 
  },
  getDocumentsByUser: async (req, res) => {
    try {
      const documents = await Document.find({ institution: req.user.id }) .select('StaffName fileType  signature createdAt location title');

      res.json(documents);

    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  },
  // Sign a pdf file
  signPdfAndQR: async (req, res) => {
    try {
      const institution = await Institution.findById(req.user.id);
      if (!institution) {
        return res.status(400).json({ msg: 'Institution not found' });
      }

      const pdfBuffer = req.file.buffer;
      const hash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

            const sign = crypto.createSign('SHA256');
            sign.update(hash);
            sign.end
            
            const signature = sign.sign(institution.privateKey,'hex');
            const qrData = JSON.stringify({hash,signature});
            const qrCodePath = path.join(__dirname, `../uploads/${req.file.filename}_qr.png`);
            const buffer = await QRCode.toBuffer(qrData,{ errorCorrectionLevel: 'H'});
            await QRCode.toFile(qrCodePath, qrData,{
              width: 100,
              height:100,
            });

            
            const pdfDoc = await PDFDocument.load(pdfBuffer);
            const writeStream = fs.createWriteStream(outputPath);
            const qrCodeImagePath = path.join(__dirname, `../uploads/${req.file.filename}_qr.png`); 
            const firstPage = pdfDoc.getPages()[0];
            
            const qrImage = await pdfDoc.embedPng(qrData);
            const { width, height } = qrImage.scale(1);
            
            firstPage.drawImage(qrImage, {
              x: 50,
              y: firstPage.getHeight() - 150,
              width: 100,
              height: 100,
            });
            
            const pdfBytes = await pdfDoc.save();

            const outputPath = path.join(__dirname, 'output.pdf');
            fs.writeFileSync(outputPath, pdfBytes);

    // Envoyer le nouveau fichier PDF en réponse
   
        
            // Save modified PDF with a new name
            const pdfbites = await pdfDoc.save();
            fs.writeFileSync(`${path.basename(`${req.file.filename}-signed.pdf`)}`,pdfbites);


            const file = new Document({
                institution: institution.id,
                StaffName: institution.headerName,
                fileType: 'pdf',
                content: pdfBuffer,
                signature
            });
            await file.save();
            res.json({msg: qrCodeImagePath})
        }
        catch(err) {
            console.error(err.message);
            res.status(500).send('Server error');
        }
    },
    VerifyPdf: async (req,res) =>{
        try {
            const pdfBuffer = fs.readFileSync(req.file.path);
            const hash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

            const pdfRecord = await Document.findOne({hash});

            if (pdfRecord) {
              res.download(pdfRecord.filePath,err => {

                if(err){
                  console.error("Error sending the file:", err);
                  res.status(500).send('Error sending the file');
                }else {
                  console.log('File sent successfully');
                }
              });
            }else {
              res.status(404).json({msg: 'No matching document found'});
            }
        }
        catch(err) {
            console.error(err.message);
            res.status(500).send('Server error');
        }
    },
    verification: async (req,res) => {
      // try {
        const pdfPath = req.file.path;
        const pdfBytes = fs.readFileSync(pdfPath);
        const pdfDoc = await PDFDocument.load(pdfBytes);

        const page = pdfDoc.getPage(0); // Get the first page
        const { width, height } = page.getSize();
        console.log(width,height);
        // Render the page to a canvas
        const pageCanvas = createCanvas(width, height);
        const pageContext = pageCanvas.getContext('2d');

        const imageData = pageContext.getImageData(0, 0, width, height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        fs.unlinkSync(pdfPath); // Delete the uploaded file after processing


        if (code) {
            res.json({ qrContent: code.data });
        } else {
            res.status(404).json({ msg: 'No QR code found in the document' });
        }
    // } catch (error) {
    //     console.error(error.message);
    //     res.status(500).send('Server error');
    // }
    },
    verifyPdfWithQRCode: async (req, res) => {
        const { fileBuffer, qrCodeData } = req.body;
      
        try {
          // Extraire les données du QR code
          const { fileId, hash, signature } = JSON.parse(qrCodeData);
      
          const file = await Document.findById(fileId);
          if (!file) {
            return res.status(400).json({ msg: 'File not found' });
          }
      
          const institution = await Institution.findById(file.institution);
          if (!institution) {
            return res.status(400).json({ msg: 'Institution not found' });
          }
      
          // Vérifier le hash du PDF fourni par l'utilisateur
          const pdfHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
          if (pdfHash !== hash) {
            return res.status(400).json({ msg: 'Hash does not match' });
          }
      
          // Vérifier la signature
          const verify = crypto.createVerify('SHA256');
          verify.update(hash);
          verify.end();
      
          const isValid = verify.verify(institution.publicKey, signature, 'hex');
          if (isValid) {
            res.json({ isValid, file: file.content.toString('base64') });
          } else {
            res.status(400).json({ msg: 'Verification failed' });
          }
        } catch (err) {
          console.error(err.message);
          res.status(500).send('Server error');
        }
      },
    signFile: async(req,res) => {
        try {
            const institution = await Institution.findById(req.user.id);
            if(!institution) {
                return res.status(400).json({msg: 'Institution not found'});
            }
            console.log(req.file);
            const fileBuffer = fs.readFileSync(req.file.path);
            console.log(fileBuffer);
            const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    const sign = crypto.createSign('SHA256');
    sign.update(hash);
    sign.end();

      const signature = sign.sign(institution.privateKey, 'hex');
      const file = new Document({institution: institution.id,StaffName: institution.headerName, fileType: req.file.mimetype.split('/')[1],hash: hash,filePath:req.file.path, signature});
      await file.save();

    res.json({ fileId: Document.id, signature });
     }
   catch(err) {
       console.error(err.message);
        res.status(500).send('Server error');
     }
  },
  VerifyFile: async (req, res) => {
   
    const { fileId } = req.file;

    console.log(fileId);

    
    try {
      const file = await File.findById(fileId);
      if (!file) {
        return res.status(400).json({ msg: 'File not found' });
      }
 
      const institution = await Institution.findById(file.institution);
      if (!institution) {
        return res.status(400).json({ msg: 'Institution not found' });
      }

      const hash = crypto.createHash('sha256').update(file.content).digest('hex');

      const verify = crypto.createVerify('SHA256');
      verify.update(hash);
      verify.end();

      const isValid = verify.verify(institution.publicKey, file.signature, 'hex');

      if (isValid) {
        res.json({ isValid, file: file.content.toString('base64') });
      } else {
        res.status(400).json({ msg: 'Verification failed' });
      }
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  },

  // @desc    Verify a document's authenticity
// @route   POST /api/qr/:documentId/verify
// @access  Public
verifyDocument: async (req, res) => {
  const documentId = req.params.documentId;
  
  // Trouver le document
  const document = await Document.findById(documentId)
    .populate({
      path: 'uploadedBy',
      select: 'firstName lastName email'
    })
    .populate({
      path: 'qrSignatureInfo.signedBy',
      select: 'firstName lastName email'
    });

  if (!document) {
    return res.status(404).json({
      success: false,
      error: 'Document non trouvé'
    });
  }

  // Vérifier si le document est signé
  if (document.status !== 'signed') {
    return res.status(400).json({
      success: false,
      error: 'Ce document n\'est pas signé'
    });
  }

  try {
    // Vérifier le hash du document original
    const originalBuffer = fs.readFileSync(document.filePath);
    const originalHash = await createPdfHash(originalBuffer);
    
    const originalHashValid = originalHash === document.originalHash;
    
    // Vérifier le hash du document signé
    const signedPdfPath = document.filePath.replace('.pdf', '_signed.pdf');
    const signedBuffer = fs.readFileSync(signedPdfPath);
    const signedHash = await createPdfHash(signedBuffer);
    
    const signedHashValid = signedHash === document.signedHash;

    // Extraire le QR Code du PDF signé
    const extractedQrData = await extractQRCodeFromPdf(signedBuffer);
    
    if (!extractedQrData) {
      return res.status(400).json({
        success: false,
        error: 'Impossible d\'extraire le QR code du document'
      });
    }
    
    // Parser les données du QR code
    const qrData = JSON.parse(extractedQrData);
    
    // Vérifier la signature ECC
    const payloadToVerify = { ...qrData };
    delete payloadToVerify.signature; // Retirer la signature pour vérification
    
    const signatureValid = await verifyECCSignature(
      JSON.stringify(payloadToVerify),
      qrData.signature
    );
    
    // Vérification supplémentaire avec RAG pour détecter des fraudes potentielles
    const fraudDetectionResult = await detectFraud(document, qrData, signedBuffer);
    
    res.status(200).json({
      success: true,
      data: {
        document: document,
        verification: {
          originalHashValid,
          signedHashValid,
          signatureValid,
          fraudDetection: fraudDetectionResult
        },
        qrData: payloadToVerify
      }
    });
    
  } catch (error) {
    console.error('Erreur lors de la vérification du document:', error);
    
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la vérification du document'
    });
  }
},
QrCode: async (req,res) => {
  try {
    if(!req.file){
      return res.status(400).json({ message: 'Aucun fichier n\'a ete telecharge'});
    }

    const { qrPosition, qrPositionX, qrPositionY, qrPages, specificPages,preset} = req.body;

     // Validation des données
     if (!qrPosition || !['custom', 'top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'].includes(qrPosition)) {
      return res.status(400).json({ message: 'Position du QR code invalide' });
    }
    
    if (!qrPages || !['all', 'first', 'last', 'specific'].includes(qrPages)) {
      return res.status(400).json({ message: 'Sélection de pages du QR code invalide' });
    }
    
    if (qrPosition === 'custom' && (qrPositionX === undefined || qrPositionY === undefined)) {
      return res.status(400).json({ message: 'Coordonnées de position personnalisée manquantes' });
    }
    
    if (qrPages === 'specific' && !specificPages) {
      return res.status(400).json({ message: 'Numéros de pages spécifiques requis' });
    }
    const originalHash = await calculateFileHash(req.file.path);

    const newDocument = new Document({
      title: req.file.originalname,
      institution: req.user.user.institution,
      // StaffName: req.user.user.id,
      filePath: req.file.path,
      fileSize: req.file.size,
      qrCodePosition:{
        x: qrPositionX,
        y: qrPositionY,
        preset: preset
      },
      uploadedBy: req.user.user.institution
    });
    await newDocument.save();

    res.status(201).json({
      message: 'Document telecharge avec succes',
      document: {
        id: newDocument._id,
        originalName: newDocument.title,
        size: newDocument.fileSize,
        uploadDate: newDocument.updatedAt,
        status: newDocument.status
      }
    });
  } catch(error) {
    console.error('Erreur lors du telechargement du document :', error);
    if(req.file){
      fs.unlink(req.file.path, (err) =>{
        if (err) console.error('Erreur lors de la suppression du fichier: ', err);
      });
    }
    res.status(500).json({ message: 'Erreur serveur lors du telechargement du fichier'})
  }
},

SignatureFinal: async (req, res) => {
  try {
    const { id } = req.params;
    const { qrContent,publicKey } = req.body;
    
    if (!qrContent) {
      return res.status(400).json({ message: 'Contenu du QR code requis' });
    }
    
    // Recherche du document
    const document = await Document.findById(id);
    if (!document) {
      return res.status(404).json({ message: 'Document non trouvé' });
    }
    
    // Vérification des autorisations (admin ou propriétaire)
    if (!req.user.user.isAdmin && document.user.toString() !== req.user.user.id) {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    
    // Vérification que le document n'a pas déjà été signé
    if (document.status === 'signed') {
      return res.status(400).json({ message: 'Ce document a déjà été signé' });
    }
    
    // Vérification de l'intégrité du fichier original
    const currentHash = await calculateFileHash(document.filePath);
    if (currentHash !== document.originalHash) {
      return res.status(400).json({ message: 'Le fichier a été modifié après le téléchargement initial' });
    }
    
    // Création du contenu du QR code avec informations de signature
    const signatureData = {
      documentId: document._id,
      originalHash: document.originalHash,
      signedBy: req.user.user.id,
      signedAt: new Date(),
      customContent: qrContent
    };
    
    // Hachage des données de signature pour vérification ultérieure
    const signatureHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(signatureData))
      .digest('hex');
    
    // Ajout du hash de signature aux données
    signatureData.signatureHash = signatureHash;
    
    // Génération du QR code
    const qrImageDataURL = await QRCode.toDataURL(JSON.stringify(signatureData));
    const qrImageData = qrImageDataURL.split(',')[1];
    
    // Chargement du document PDF
    const pdfBytes = fs.readFileSync(document.filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    
    // Détermination des pages où ajouter le QR code
    const pageCount = pdfDoc.getPageCount();
    let pagesToModify = [];
    
    switch (document.qrPages.type) {
      case 'all':
        pagesToModify = Array.from({ length: pageCount }, (_, i) => i);
        break;
      case 'first':
        pagesToModify = [0];
        break;
      case 'last':
        pagesToModify = [pageCount - 1];
        break;
      case 'specific':
        // Analyse des pages spécifiques (ex: "1,3,5-7")
        if (document.qrPages.specificPages) {
          const pageRanges = document.qrPages.specificPages.split(',');
          pageRanges.forEach(range => {
            if (range.includes('-')) {
              const [start, end] = range.split('-').map(num => parseInt(num) - 1);
              for (let i = start; i <= end; i++) {
                if (i >= 0 && i < pageCount) pagesToModify.push(i);
              }
            } else {
              const pageNum = parseInt(range) - 1;
              if (pageNum >= 0 && pageNum < pageCount) pagesToModify.push(pageNum);
            }
          });
        }
        break;
    }
    
    // Création d'une image à partir du QR code
    const qrImage = await pdfDoc.embedPng(Buffer.from(qrImageData, 'base64'));
    
    // Définition de la taille du QR code (en points)
    const qrSize = 100;
    
    // Ajout du QR code à chaque page sélectionnée
    pagesToModify.forEach(pageIndex => {
      const page = pdfDoc.getPage(pageIndex);
      const { width, height } = page.getSize();
      
      // Détermination de la position du QR code en fonction du paramètre
      let x, y;
      
      if (document.qrPosition.type === 'custom') {
        // Position personnalisée basée sur les pourcentages
        x = (document.qrPosition.x / 100) * width;
        y = height - ((document.qrPosition.y / 100) * height) - qrSize; // Inversion de Y car PDF utilise l'origine en bas à gauche
      } else {
        // Positions prédéfinies
        const margin = 20;
        switch (document.qrPosition.type) {
          case 'top-left':
            x = margin;
            y = height - margin - qrSize;
            break;
          case 'top-right':
            x = width - margin - qrSize;
            y = height - margin - qrSize;
            break;
          case 'bottom-left':
            x = margin;
            y = margin;
            break;
          case 'bottom-right':
            x = width - margin - qrSize;
            y = margin;
            break;
          case 'center':
            x = (width - qrSize) / 2;
            y = (height - qrSize) / 2;
            break;
        }
      }
      
      // Dessin du QR code sur la page
      page.drawImage(qrImage, {
        x,
        y,
        width: qrSize,
        height: qrSize
      });
    });
    
    // Enregistrement du document signé
    const signedPdfBytes = await pdfDoc.save();
    const signedFilePath = path.join(__dirname, 'signed', `signed-${document.fileName}`);
    
    // Création du répertoire des documents signés s'il n'existe pas
    const signedDir = path.join(__dirname, 'signed');
    if (!fs.existsSync(signedDir)) {
      fs.mkdirSync(signedDir, { recursive: true });
    }
    
    // Écriture du document signé
    fs.writeFileSync(signedFilePath, signedPdfBytes);
    
    // Mise à jour du document dans la base de données
    document.status = 'signed';
    document.signatureInfo = {
      signedBy: req.user.user.id,
      signedAt: new Date(),
      signatureHash,
      qrContent
    };
    
    await document.save();
    
    res.status(200).json({
      message: 'Document signé avec succès',
      document: {
        id: document._id,
        originalName: document.originalName,
        status: document.status,
        signedAt: document.signatureInfo.signedAt
      }
    });
  } catch (error) {
    console.error('Erreur lors de la signature du document:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la signature du document' });
  }
},

DownloadDocument: async (req, res) => {
  try {
    const { id } = req.params;
    
    // Recherche du document
    const document = await Document.findById(id);
    if (!document) {
      return res.status(404).json({ message: 'Document non trouvé' });
    }
    
    // Vérification des autorisations (admin ou propriétaire)
    if (!req.user.user.isAdmin && document.user.toString() !== req.user.user.id) {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    
    // Chemin du fichier à télécharger
    let filePath;
    if (document.status === 'signed') {
      filePath = path.join(__dirname, 'signed', `signed-${document.fileName}`);
    } else {
      filePath = document.filePath;
    }
    
    // Vérification de l'existence du fichier
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Fichier non trouvé sur le serveur' });
    }
    
    // Envoi du fichier
    res.download(filePath, document.status === 'signed' 
      ? `signed-${document.originalName}` 
      : document.originalName);
  } catch (error) {
    console.error('Erreur lors du téléchargement du document:', error);
    res.status(500).json({ message: 'Erreur serveur lors du téléchargement du document' });
  }
},
DeleteDocument: async (req, res) => {
  try {
    const { id } = req.params;
    
    // Recherche du document
    const document = await Document.findById(id);
    if (!document) {
      return res.status(404).json({ message: 'Document non trouvé' });
    }
    
    // Vérification des autorisations (admin ou propriétaire)
    if (!req.user.user.isAdmin && document.user.toString() !== req.user.user.id) {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    
    // Suppression des fichiers
    if (fs.existsSync(document.filePath)) {
      fs.unlinkSync(document.filePath);
    }
    
    // Suppression du fichier signé s'il existe
    const signedFilePath = path.join(__dirname, 'signed', `signed-${document.fileName}`);
    if (fs.existsSync(signedFilePath)) {
      fs.unlinkSync(signedFilePath);
    }
    
    // Suppression du document de la base de données
    await Document.findByIdAndDelete(id);
    
    res.status(200).json({ message: 'Document supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression du document:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la suppression du document' });
  }
},
// Route pour obtenir les détails d'un document
DocumentDetails: async (req, res) => {
  try {
    const { id } = req.params;
    
    // Recherche du document avec les informations utilisateur
    const document = await Document.findById(id)
      .populate('user', 'username email')
      .populate('signatureInfo.signedBy', 'username email');
    
    if (!document) {
      return res.status(404).json({ message: 'Document non trouvé' });
    }
    
    // Vérification des autorisations (admin ou propriétaire)
    if (!req.user.user.isAdmin && document.user._id.toString() !== req.user.user.id) {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    
    res.status(200).json({ document });
  } catch (error) {
    console.error('Erreur lors de la récupération des détails du document:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des détails du document' });
  }
},

newDocumentSign: async (req, res) => {
  try {
    const {
      hashOriginal,
      signatureOriginal,
      hashSignedDocument,
      signatureSigned,
      uniqueId,
      publicKey,
      certificate,
      file, // base64 string
      signBy,
      uploadedBy,
      positionQrcode,
      institutionId,
      titre,
      positionType
    } = req.body;

   

    const existingDoc = await Document.findOne({ qrContent: uniqueId });
    if (existingDoc) {
      return res.status(409).json({
        error: "Un document avec ce identifiant existe déjà. Veuillez réessayer.",
      });
    }

    // Vérification si un document existe déjà avec le même hash ou signature
    const existingDocument = await Document.findOne({
      $or: [
        { hashOriginal: hashOriginal },
        { signedHashOriginal: signatureOriginal }
      ]
    });

    // Si le document existe déjà, on rejette la demande avec une erreur
    if (existingDocument) {
      return res.status(409).json({
        error: 'Le document a déjà été signé avec cette signature.',
        document: existingDocument
      });
    }

    // Decode le fichier PDF depuis base64
    const buffer = Buffer.from(file, 'base64');

    // Emplacement du dossier pour sauvegarder le fichier
    const uploadDir = path.join(__dirname, '../uploads/documents/');
    
    // Vérifier si le dossier existe, sinon le créer
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Nom et chemin du fichier signé
    const fileName = `signed-${Date.now()}.pdf`;
    const filePath = path.join(uploadDir, fileName);

    // Enregistrer le fichier PDF signé sur le disque
    fs.writeFileSync(filePath, buffer);

    // Créer un nouveau document dans la base de données
    const newDoc = new Document({
      title: `${titre}`.toUpperCase(),
      institution: institutionId, // Prend l'institution de la requête
      StaffName: 'None', // Ou extraire depuis `signBy`
      fileSize: `${Math.round(buffer.length / 1024)} KB`,
      filePath: filePath,
      status: 'signed',
      qrCodePosition: positionQrcode,
      originalHash: hashOriginal,
     // signedHashOriginal: signatureOriginal,
      HashSigned: hashSignedDocument,
      signedDocument: signatureSigned,
      qrContent: uniqueId,
      qrPositionType: positionType,
      qrSignatureInfo: {
        signedBy: signBy,
        signedAt: new Date(),
        signatureHash: signatureSigned,
        publicKey: publicKey,
        qrContent: uniqueId
      },
      uploadedBy,
      createdAt: new Date(),
      updatedAt: new Date(),
      history: [
        {
          action: 'signed',
          actor: signBy,
          timestamp: new Date(),
          comment: 'Document signé par système'
        }
      ]
    });

    // Sauvegarder le nouveau document dans la base de données
    await newDoc.save();

    res.status(201).json({
      message: 'Document signé enregistré avec succès',
      document: newDoc
    });
  } catch (err) {
    console.error('Erreur signature document :', err);
    res.status(500).json({ error: 'Erreur lors de l’enregistrement du document signé' });
  }
},

getUserUploadedOrSignedDocuments: async (req, res) => {
  try {
    const userId = req.user.id;

    const docs = await Document.find({
      $or: [
        { 'qrSignatureInfo.signedBy': userId },
        { uploadedBy: userId }
      ]
    }).sort({ createdAt: -1 });

    res.status(200).json(docs);
  } catch (err) {
    console.error('Erreur récupération documents :', err);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des documents.' });
  }
},

signPendingDocument: async (req, res) => {
  try {
    const documentId = req.params.id;
    const { 
      signatureSigned,
      uniqueId,
      publicKey,
      file, // Base64 encoded PDF
    } = req.body;

    // Find the document by ID
    const document = await Document.findById(documentId);
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Verify document is in "prepared" status
    if (document.status !== 'pending') {
      return res.status(400).json({ 
        message: `Document cannot be signed because it is in "${document.status}" status. Only "pending" documents can be signed.` 
      });
    }

    // Get file path to save the signed document
    const uploadsDir = path.join(__dirname, '../uploads/documents');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Create a unique filename for the signed document
    const originalFilename = path.basename(document.filePath);
    const signedFilename = `signed-${Date.now()}-${originalFilename}`;
    const signedFilePath = path.join(uploadsDir, signedFilename);

    // Convert base64 to file and save it
    const base64Data = file.replace(/^data:application\/pdf;base64,/, '');
    fs.writeFileSync(signedFilePath, Buffer.from(base64Data, 'base64'));

    // Update document with signature information
    document.status = 'signed';
    document.signatureSigned = signatureSigned;
    document.signedDocument = `/uploads/signed/${signedFilename}`;
    document.qrContent = uniqueId;
    document.filePath = signedFilePath;
    document.qrSignatureInfo = {
      signedBy: req.user.id,
      signedAt: new Date(),
      signatureHash: signatureSigned,
      publicKey: publicKey,
      qrInnerContent: JSON.stringify({ uniqueId })
    };
    document.updatedAt = new Date();

    // Add to history
    document.history.push({
      action: 'signed',
      actor: req.user._id,
      timestamp: new Date(),
      comment: 'Document signed via digital certificate'
    });

    await document.save();

    res.status(200).json({
      message: 'Document signed successfully',
      document: {
        id: document._id,
        title: document.title,
        status: document.status,
        signedAt: document.qrSignatureInfo.signedAt
      }
    });
  } catch (error) {
    console.error('Error signing document:', error);
    res.status(500).json({ message: 'Server error while signing document', error: error.message });
  }
},




 addWaitingDocument:async (req, res) => {
  try {
    const {
      file, // base64 du PDF original
      uploadedBy,
      institutionId,
      titre,
      hashOriginal,
      positionQrcode,
      positionType
    } = req.body;
    console.log('addWaitingDocument:', req.body);

    // Vérifier si un document avec ce hashOriginal est déjà en attente
    const existing = await Document.findOne({
      originalHash: hashOriginal,
     
    });

    console.log(' Document waiting list:');
    if (existing) {
      return res.status(409).json({
        error: 'Ce document est déjà en attente de signature.',
        document: existing
      });
    }

    // Convertir le PDF base64 en buffer
    const buffer = Buffer.from(file, 'base64');

    // Dossier de destination
    const uploadDir = path.join(__dirname, '../uploads/pending/');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileName = `pending-${Date.now()}.pdf`;
    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, buffer);

    // Création du document
    const newDoc = new Document({
      title: `${titre}`.toUpperCase(),
      institution: institutionId,
      fileSize: `${Math.round(buffer.length / 1024)} KB`,
      filePath: filePath,
      status: 'pending',
      StaffName: 'None', // Ou extraire depuis `signBy`
    
      qrCodePosition: positionQrcode,
      qrPositionType: positionType,
      originalHash: hashOriginal,
      uploadedBy,
      createdAt: new Date(),
      updatedAt: new Date(),
      history: [
        {
          action: 'uploaded',
          actor: uploadedBy,
          timestamp: new Date(),
          comment: 'Document mis en attente de signature',
        }
      ]
    });

    await newDoc.save();

    return res.status(201).json({
      message: 'Document en attente ajouté avec succès.',
      document: newDoc
    });

  } catch (error) {
    console.error('Erreur addWaitingDocument:', error);
    return res.status(500).json({
      error: "Erreur lors de l'enregistrement du document en attente"
    });
  }
},

getPendingDocuments: async (req, res) => {
  try {
    const userId = req.user.id;

    // Récupérer l'institution du user
    const user = await User.findById(userId).populate('institution');
    if (!user || !user.institution) {
      return res.status(404).json({ message: "Institution non trouvée" });
    }

    // Récupérer uniquement les documents en attente
    const pendingDocuments = await Document.find({
      institution: user.institution._id,
      status: 'pending'
    })
      .populate({ path: 'uploadedBy', select: 'name email' });

    res.json(pendingDocuments);
  } catch (error) {
    console.error("Erreur lors de la récupération des documents en attente :", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
},


getInstitutionDocuments: async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).populate('institution');
    if (!user || !user.institution) {
      return res.status(404).json({ message: "Institution non trouvée" });
    }

    const documents = await Document.find({ institution: user.institution._id })
      .populate({ path: 'qrSignatureInfo.signedBy', select: 'name email' })
      .populate({ path: 'uploadedBy', select: 'name email' });

    res.json(documents);
  } catch (error) {
    console.error("Erreur lors de la récupération :", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
},


rejectDocument: async (req, res) => {
  const { id } = req.params;
  const { reason,} = req.body;

  console.log("Rejet du document avec ID:", id);
  try {
    const document = await Document.findById(id);
    if (!document) {
      return res.status(409).json({ message: "Document introuvable." });
    }

    if (document.status === 'signed') {
      return res.status(400).json({ message: "Impossible de rejeter un document déjà signé." });
    }

    // Mise à jour du statut
    document.status = 'rejected';
    document.rejection = {
      rejectedBy: req.user._id,
      reason: reason || 'Aucune raison spécifiée',
      rejectedAt: new Date()
    };

    // Historique
    document.history.push({
      action: 'rejected',
      actor: req.user._id,
      comment: reason,
    });

    await document.save();

    return res.status(200).json({ message: "Document rejeté avec succès." });
  } catch (error) {
    console.error("Erreur lors du rejet du document:", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
},


};

module.exports = DocumentController;