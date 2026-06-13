const express = require('express');
const authenticate = require('../../middlewares/authenticate');
const resolveActiveCompany = require('../../middlewares/resolveActiveCompany');
const requireNotBanned = require('../../middlewares/requireNotBanned');
const authorize = require('../../middlewares/authorize');
const controller = require('./files.controller');

const router = express.Router();

router.use(authenticate, resolveActiveCompany, requireNotBanned);

router.post('/upload-url', controller.createUploadUrl);
router.post('/confirm', controller.confirmUpload);
router.post('/:id/abort', controller.abortUpload);
router.get('/:id/download-url', controller.getDownloadUrl);
router.get('/', authorize('files.profile.view'), controller.listFiles);
router.delete('/:id', authorize('files.profile.delete'), controller.removeFile);
router.post('/:id/review', controller.reviewFile);

module.exports = router;
