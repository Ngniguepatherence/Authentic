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
  }

};

module.exports = DocumentController;