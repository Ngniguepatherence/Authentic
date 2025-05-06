const express = require('express');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const router = express.Router();

router.post('/validate-token', (req,res) => {
    const { token } = req.body;

    try {
        const decoded = jwt.verify(token, process.env.SECRET);
        const { organizatonId } = decoded
        return res.status(200).json({organizatonId});
    } catch(err) {
        return res.status(401).json({ error: 'Token invalide ou expiré'});
    }
});

module.exports = router;

