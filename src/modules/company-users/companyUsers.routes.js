const express = require('express');
const authenticate = require('../../middlewares/authenticate');
const resolveActiveCompany = require('../../middlewares/resolveActiveCompany');
const requireNotBanned = require('../../middlewares/requireNotBanned');
const authorize = require('../../middlewares/authorize');
const controller = require('./companyUsers.controller');

const router = express.Router();

router.use(authenticate, resolveActiveCompany, requireNotBanned);

router.get('/', authorize('users.view'), controller.listCompanyUsers);
router.post('/invite', authorize('users.create'), controller.inviteCompanyUser);
router.put('/:id', authorize('users.update'), controller.updateCompanyUser);
router.delete('/:id', authorize('users.update'), controller.removeCompanyUser);

module.exports = router;
