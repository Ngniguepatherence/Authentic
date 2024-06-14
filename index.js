const express = require('express')
const bodyParser = require('body-parser');
require('dotenv').config();
const InstitutionRoute = require('./router/InstitutionRoute');
const UserRoute = require('./router/UserRoute');
const StatRoute = require('./router/StatRoute');
const cors = require('cors');
const DocumentRoute = require('./router/DocumentRoutes');
const AdminRoute = require('./router/AdminRoutes');
const PORT = process.env.PORT || 5000;
const connectDB = require('./models/db');
const app  = express();
const path = require('path');

connectDB()

const corsOptions = {
    origin: "*",
    credentials: true, //access-control-allow-credentials:true
    optionSuccessStatus: 200,
  };
  
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// /number/users/institution/:id
app.use('/api/files',express.static(path.join(__dirname, '/uploads')));

app.use('/api/institutions',InstitutionRoute);
app.use('/api/doc',DocumentRoute);
app.use('/api/admin', AdminRoute);
app.use('/api/stat', StatRoute);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

