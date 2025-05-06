const express = require('express')
const bodyParser = require('body-parser');
require('dotenv').config();
const InstitutionRoute = require('./router/InstitutionRoute');
const UserRoute = require('./router/UserRoute');
const StatRoute = require('./router/StatRoute');
const cors = require('cors');
const DocumentRoute = require('./router/DocumentRoutes');
const AdminRoute = require('./router/AdminRoutes');
const validatedRoute = require('./router/validationRoutes');
const validToken = require('./router/validate-token');
const PORT = process.env.PORT || 4000;
const helmet = require('helmet');
const connectDB = require('./models/db');
const Synchro = require("./router/Synchroning");
const app  = express();
const path = require('path');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
//  659227598

connectDB()

const corsOptions = {
    origin: "*",
    credentials: true, //access-control-allow-credentials:true
    optionSuccessStatus: 200,
  };
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Trop de requetes depuis cette IP, veuillez reessayer apres 15 minutes'
});
app.use('/api/',limiter);

app.use(morgan('combined'));

// /number/users/institution/:id
app.use('/api/files',express.static(path.join(__dirname, '/uploads')));

app.use('/api/institutions',InstitutionRoute);
app.use('/api/doc',DocumentRoute);
app.use('/api/admin', AdminRoute);
app.use('/api/stat', StatRoute);
app.use('/api/secure',Synchro);
app.use('/v1/validate',validatedRoute);
app.use('/v1/validate',validToken);
// app.use('/api/qr',qrRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Une erreur est survenue' : err.message
  });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

