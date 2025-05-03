const nodemailer = require("nodemailer");



module.exports =  async function sendEmail(to, subject, text ){
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  await transporter.sendMail({
    from: 'ngniguepafaha@gmail.com',
    to,
    subject,
    text
  });
}
