const express = require('express');
const authenticate = require('../../middlewares/authenticate');
const controller = require('./companies.controller');

const router = express.Router();

router.use(authenticate);

router.get('/', controller.listCompanies);
router.post('/', controller.createCompany);

module.exports = router;
