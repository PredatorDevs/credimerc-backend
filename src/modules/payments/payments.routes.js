const express = require('express');
const authenticate = require('../../middlewares/authenticate');
const resolveActiveCompany = require('../../middlewares/resolveActiveCompany');
const requireNotBanned = require('../../middlewares/requireNotBanned');
const authorize = require('../../middlewares/authorize');
const controller = require('./payments.controller');

const router = express.Router();

router.use(authenticate, resolveActiveCompany, requireNotBanned);

router.get('/loans/:loanId/payments', authorize('payments.view'), controller.listLoanPayments);
router.post('/loans/:loanId/payments', authorize('payments.create'), controller.createLoanPayment);
router.post('/payments/:id/void', authorize('payments.void'), controller.voidPayment);

module.exports = router;
