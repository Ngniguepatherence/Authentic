const crypto = require('crypto');
const Document = require('../models/document');
const Institution = require('../models/Institutions');
const User = require('../models/User');
const { PDFDocument, rgb } = require('pdf-lib');
const QRCode = require('qrcode');
const fs = require('fs');


const generatePdfWithQRCode = async (pdfBytes, qrCodeData) => {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const qrCodeImage = await QRCode.toDataURL(qrCodeData);
    const qrCodeImageBytes = Buffer.from(qrCodeImage.split('base64,')[1], 'base64');
    
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const qrCodeImageDims = 100; // Taille de l'image QR code
    
    // Intégrer l'image QR code dans le document PDF
    page.drawImage(qrCodeImageBytes, {
      x: width - qrCodeImageDims - 50,
      y: height - qrCodeImageDims - 50,
      width: qrCodeImageDims,
      height: qrCodeImageDims,
    });
    
    const modifiedPdfBytes = await pdfDoc.save();
    return modifiedPdfBytes;
  };
// Sign Document
const DocumentController = {
    SignDocument: async(req,res) => {
        const { content } = req.body;

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
    signPdfAndQR: async (req,res) =>{
        try {
            const institution = await Institution.findById(req.user.id);
            if(!institution){
                return res.status(400).json({msg:'Institution not found'});
            }

            const pdfBuffer = req.file.buffer;
            const hash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

            const sign = crypto.createSign('SHA256');
            sign.update(hash);
            sign.end

            const signature = sign.sign(institution.privateKey,'hex');
            const qrData = JSON.stringify({hash,signature});
            const qrCodeImage = await QRCode.toDataURL(qrData);

            const file = new Document({
                institution: institution.id,
                StaffName: institution.headerName,
                fileType: 'pdf',
                content: pdfBuffer,
                signature
            });
            await file.save();
            const signedPdfWithQRCode = await generatePdfWithQRCode(file.content, qrCodeImage);

            res.set({
                'Content-Type':'application/pdf',
                'Content-Disposition': 'attachment; filename="signed_documentWQR.pdf"',
            });

            res.send(signedPdfWithQRCode);
        }
        catch(err) {
            console.error(err.message);
            res.status(500).send('Server error');
        }
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

            const fileBuffer = req.file.buffer;
            const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

            const sign = crypto.createSign('SHA256');
            sign.update(hash);
            sign.end();

            const signature = sign.sign(institution.privateKey, 'hex');
            const file = new Document({institution: institution.id, fileType: req.file.mimetype.split('/')[1],content: fileBuffer, signature});
            await file.save();

            res.json({ fileId: Document.id, signature});
        }
        catch(err) {
            console.error(err.message);
            res.status(500).send('Server error');
        }
    },
    VerifyFile: async(req,res) => {
        const { fileId } = req.body;

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