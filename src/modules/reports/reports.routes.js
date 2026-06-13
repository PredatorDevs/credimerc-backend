const express = require('express');
const authenticate = require('../../middlewares/authenticate');
const resolveActiveCompany = require('../../middlewares/resolveActiveCompany');
const requireNotBanned = require('../../middlewares/requireNotBanned');
const authorize = require('../../middlewares/authorize');
const controller = require('./reports.controller');

const router = express.Router();

router.use(authenticate, resolveActiveCompany, requireNotBanned);

router.get('/portfolio', authorize('reports.view'), controller.portfolio);
router.get('/overdue-loans', authorize('reports.view'), controller.overdueLoans);
router.get('/daily-payments', authorize('reports.view'), controller.dailyPayments);
router.get('/collector-payments', authorize('reports.view'), controller.collectorPayments);

module.exports = router;
