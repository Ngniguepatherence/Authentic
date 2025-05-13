const jwt = require('jsonwebtoken');
require('dotenv').config();

const secret = process.env.SECRET;

const midlleware = (req,res, next) => {
    const token = req.headers['authorization']?.split(' ')[1]; // Extraction du token
    

    console.log("_+++++++++++++++== ✅ l✅ l✅ l✅ l✅ l==============================================", token);
    
    
    if (!token) {
        return res.status(401).json({ msg: "No token, authorization denied" });
    }

    try {
        // Vérification du token
        const decoded = jwt.verify(token, secret);

        // Si le token est valide, on ajoute l'utilisateur au request object
        if (decoded && decoded.user) {
            req.user = decoded.user;
            console.log('Decoded User:', decoded.user); // Log pour le débogage
            next();
        } else {
            return res.status(401).json({ msg: "Invalid token structure" });
        }
    } catch (err) {
        console.error('Token verification error:', err); // Log de l'erreur
        return res.status(401).json({ msg: 'Token is not valid' });
    }
};

module.exports = midlleware;