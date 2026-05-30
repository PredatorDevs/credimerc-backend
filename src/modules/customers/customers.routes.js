const express = require('express');
const authenticate = require('../../middlewares/authenticate');
const resolveActiveCompany = require('../../middlewares/resolveActiveCompany');
const requireNotBanned = require('../../middlewares/requireNotBanned');
const authorize = require('../../middlewares/authorize');
const controller = require('./customers.controller');

const router = express.Router();

router.use(authenticate, resolveActiveCompany, requireNotBanned);

router.get('/', authorize('customers.view'), controller.listCustomers);
router.post('/', authorize('customers.create'), controller.createCustomer);
router.get('/:id', authorize('customers.view'), controller.getCustomer);
router.put('/:id', authorize('customers.update'), controller.updateCustomer);
router.delete('/:id', authorize('customers.update'), controller.deleteCustomer);

module.exports = router;
