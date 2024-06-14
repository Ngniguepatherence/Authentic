const Document = require('../models/document');
const Institution = require('../models/Institutions');
const User = require('../models/User');


const StatController = {
    getTotalUsers: async (req, res) => {
        try {
          const usersCount = await User.countDocuments();
          res.json({ totalUsers: usersCount });
        } catch (err) {
          res.status(500).send('Server error');
        }
      },

    getTotalInstitutions: async (req, res) => {
        try {
          const instCount = await Institution.countDocuments();
          res.json({ totalInstitutions: instCount });
        } catch (err) {
          res.status(500).send('Server error');
        }
      },

      getTotalDocs: async (req, res) => {
        try {
          const docCount = await Document.countDocuments();
          res.json({ totalDocs: docCount });
        } catch (err) {
          res.status(500).send('Server error');
        }
      },

      getTotalUsersPerInstitution: async (req, res) => {
        try {
          const { idInstitution } = req.params;
          const totalUsers = await Document.distinct('StaffName', { institution: idInstitution });
          res.json({ totalUsers: totalUsers.length });
        } catch (error) {
          console.error(error);
          res.status(500).json({ message: 'Une erreur est survenue' });
        }
      },

      getSignedDocsPerUser: async (req, res) => {
        try {
          const signedDocsPerUser = await Document.aggregate([
            {
              $group: {
                _id: '$user',
                signedDocs: { $sum: 1 },
              },
            },
          ]);
    
          res.json(signedDocsPerUser);
        } catch (err) {
          res.status(500).send('Server error');
        }
      },
      

};

module.exports = StatController;