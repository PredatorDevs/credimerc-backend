const express = require('express');
const controller = require('./auth.controller');

const router = express.Router();

router.post('/register', controller.register);
router.post('/login', controller.login);
router.post('/refresh', controller.refresh);
router.post('/logout', controller.logout);
router.post('/forgot-password', controller.forgotPassword);
router.post('/reset-password', controller.resetPassword);
router.get('/me', ...controller.withAuth, controller.me);
router.post('/select-company', ...controller.withAuth, controller.selectCompany);

module.exports = router;
