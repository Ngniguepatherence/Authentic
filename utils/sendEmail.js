const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
require('dotenv').config();


const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false, // true si port 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendLoginInfoMail(to, username, password) {
  const mailOptions = {
    from: `"Support Doc Authentic" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Vos identifiants de connexion',
    html: `
      <h3>Bienvenue sur notre plateforme !</h3>
      <p>Voici vos informations de connexion :</p>
      <ul>
        <li><strong>Identifiant :</strong> ${username}</li>
        <li><strong>Mot de passe :</strong> ${password}</li>
      </ul>
      <p>Veuillez changer votre mot de passe après connexion pour plus de sécurité.</p>
    `
  };

  await transporter.sendMail(mailOptions);
}
async function sendConfirmationEmail(to,organisationId) {
  const token = jwt.sign(
    {organisationId}, process.env.SECRET,
    { expiresIn: '1d'}
  );

  const confirmationLink = `${process.env.FRONTEND_URL}/tutoUser?token=${token}`;

  const mailOptions = {
    from: `"Support Authentic Platform" <${process.env.EMAIL_USER}>`,
    to: to,
    subjeect: 'Confirmez votre compte',
    html: `
      <h3>Bienvenue sur la platforme Authentic ${to}!</h3>
      <p>Pour compléter votre inscription, veuillez cliquer sur le bouton ci-dessous :</p>
      <p>
        <a href="${confirmationLink}" style="padding: 10px 20px; background-color: #007bff; color: #fff; text-decoration: none; border-radius: 4px;">
          Confirmer mon compte
        </a>
      </p>
      <p>Ce lien expirera dans 24 heures.</p>
    `
  };
  await transporter.sendMail(mailOptions);
}

module.exports = { sendLoginInfoMail,sendConfirmationEmail };
