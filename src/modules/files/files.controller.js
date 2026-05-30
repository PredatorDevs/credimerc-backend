const {
  createUploadUrlSchema,
  confirmUploadSchema,
  listFilesSchema,
  reviewFileSchema
} = require('./files.validation');
const filesService = require('./files.service');

function parseSchema(schema, data, res) {
  const result = schema.safeParse(data);
  if (!result.success) {
    res.status(400).json({
      error: 'BAD_REQUEST',
      message: 'Validation failed.',
      details: result.error.flatten()
    });
    return null;
  }
  return result.data;
}

function hasPermission(req, permission) {
  const list = req.auth?.permissions || [];
  return list.includes(permission);
}

async function createUploadUrl(req, res, next) {
  try {
    const payload = parseSchema(createUploadUrlSchema, req.body, res);
    if (!payload) return;

    const requiredPermission = filesService.selectUploadPermission(payload.category);
    if (!hasPermission(req, requiredPermission)) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Missing required permission.' });
    }

    const data = await filesService.createUploadUrl({
      auth: req.auth,
      companyId: req.company.id,
      payload
    });

    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
}

async function confirmUpload(req, res, next) {
  try {
    const payload = parseSchema(confirmUploadSchema, req.body, res);
    if (!payload) return;

    const data = await filesService.confirmUpload({
      companyId: req.company.id,
      id: payload.id,
      checksumSha256: payload.checksumSha256
    });

    if (!data) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Attachment not found.' });
    }

    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
}

async function getDownloadUrl(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'Invalid id.' });
    }

    const data = await filesService.getDownloadUrl({
      companyId: req.company.id,
      id
    });

    if (!data) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Attachment not found.' });
    }

    if (!hasPermission(req, data.requiredPermission)) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Missing required permission.' });
    }

    return res.status(200).json({
      id: data.id,
      downloadUrl: data.downloadUrl,
      expiresInSeconds: data.expiresInSeconds
    });
  } catch (error) {
    return next(error);
  }
}

async function listFiles(req, res, next) {
  try {
    const query = parseSchema(listFilesSchema, req.query, res);
    if (!query) return;

    const items = await filesService.listFiles({
      companyId: req.company.id,
      ownerType: query.ownerType,
      ownerId: query.ownerId,
      category: query.category
    });

    return res.status(200).json({ items });
  } catch (error) {
    return next(error);
  }
}

async function removeFile(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'Invalid id.' });
    }

    const removed = await filesService.removeFile({
      companyId: req.company.id,
      id,
      companyUserId: req.auth.companyUserId
    });

    if (!removed) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Attachment not found.' });
    }

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

async function reviewFile(req, res, next) {
  try {
    if (!hasPermission(req, 'files.id.review')) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Missing required permission.' });
    }

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'Invalid id.' });
    }

    const payload = parseSchema(reviewFileSchema, req.body, res);
    if (!payload) return;

    const data = await filesService.reviewFile({
      companyId: req.company.id,
      id,
      companyUserId: req.auth.companyUserId,
      decision: payload.decision,
      notes: payload.notes
    });

    if (!data) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Attachment not found.' });
    }

    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createUploadUrl,
  confirmUpload,
  getDownloadUrl,
  listFiles,
  removeFile,
  reviewFile
};
