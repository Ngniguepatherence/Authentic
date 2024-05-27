const express = require('express')
require('dotenv').config();
const InstitutionRoute = require('./router/InstitutionRoute');
const cors = require('cors');
const DocumentRoute = require('./router/DocumentRoutes');
const PORT = process.env.PORT || 5000;
const connectDB = require('./models/db');
const app  = express();

connectDB()

const corsOptions = {
    origin: "*",
    credentials: true, //access-control-allow-credentials:true
    optionSuccessStatus: 200,
  };
  
app.use(cors(corsOptions));
app.use(express.json());
  

app.use('/api/institutions',InstitutionRoute);
app.use('/api/doc',DocumentRoute);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});