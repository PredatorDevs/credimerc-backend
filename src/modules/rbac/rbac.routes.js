const express = require('express');
const authenticate = require('../../middlewares/authenticate');
const resolveActiveCompany = require('../../middlewares/resolveActiveCompany');
const requireNotBanned = require('../../middlewares/requireNotBanned');
const authorize = require('../../middlewares/authorize');
const controller = require('./rbac.controller');

const router = express.Router();

router.use(authenticate, resolveActiveCompany, requireNotBanned);

router.get('/permissions', authorize('roles.manage'), controller.listPermissions);
router.get('/roles', authorize('roles.manage'), controller.listRoles);
router.post('/roles', authorize('roles.manage'), controller.createRole);
router.put('/roles/:id', authorize('roles.manage'), controller.updateRole);
router.delete('/roles/:id', authorize('roles.manage'), controller.deleteRole);
router.put('/roles/:id/permissions', authorize('roles.manage'), controller.setRolePermissions);
router.put('/company-users/:id/roles', authorize('roles.manage'), controller.setCompanyUserRoles);

module.exports = router;
