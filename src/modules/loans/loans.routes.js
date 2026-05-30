const express = require('express');
const authenticate = require('../../middlewares/authenticate');
const resolveActiveCompany = require('../../middlewares/resolveActiveCompany');
const requireNotBanned = require('../../middlewares/requireNotBanned');
const authorize = require('../../middlewares/authorize');
const controller = require('./loans.controller');

const router = express.Router();

router.use(authenticate, resolveActiveCompany, requireNotBanned);

router.get('/', authorize('loans.view'), controller.listLoans);
router.post('/', authorize('loans.create'), controller.createLoan);
router.get('/overdue', authorize('loans.view'), controller.overdueLoans);
router.get('/:id', authorize('loans.view'), controller.getLoan);
router.put('/:id', authorize('loans.update'), controller.updateLoan);
router.post('/:id/cancel', authorize('loans.cancel'), controller.cancelLoan);

module.exports = router;
