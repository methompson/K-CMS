const router = require('express').Router();

const authController = require('../controllers/auth');

router.post('/login', authController.authenticateUserCredentials);
router.get('/login', authController.doNothing);

module.exports = router;