const path = require('path');
const { randomUUID } = require('crypto');
const db = require('../../lib/db');
const env = require('../../config/env');
const s3 = require('../../lib/s3');

function resolveExtension(fileName) {
  const ext = path.extname(fileName || '').toLowerCase();
  return ext ? ext.replace('.', '') : null;
}

function resolveObjectKey({ companyId, ownerType, ownerId, category, extension }) {
  const categoryPath = category.toLowerCase().replaceAll('_', '-');
  const ownerTypePath = ownerType.toLowerCase();
  const objectId = randomUUID();
  const suffix = extension ? `.${extension}` : '';
  return `companies/${companyId}/${ownerTypePath}s/${ownerId}/${categoryPath}/${objectId}${suffix}`;
}

function selectUploadPermission(category) {
  if (category === 'PROFILE_PHOTO') return 'files.profile.upload';
  if (category === 'SUPPORTING_DOCUMENT') return 'files.supporting.upload';
  return 'files.id.upload';
}

function selectViewPermission(category) {
  if (category === 'PROFILE_PHOTO') return 'files.profile.view';
  if (category === 'SUPPORTING_DOCUMENT') return 'files.supporting.view';
  return 'files.id.view';
}

function toAttachmentResponse(row) {
  return {
    id: row.id,
    publicId: row.public_id,
    companyId: row.company_id,
    ownerType: row.owner_type,
    ownerId: row.owner_id,
    category: row.category,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function getAttachmentById({ companyId, id }) {
  const [rows] = await db.execute(
    `SELECT * FROM attachments WHERE company_id = :companyId AND id = :id AND deleted_at IS NULL LIMIT 1`,
    { companyId, id }
  );

  return rows[0] || null;
}

async function createUploadUrl({ auth, companyId, payload }) {
  const publicId = randomUUID();
  const extension = resolveExtension(payload.originalFileName);
  const objectKey = resolveObjectKey({
    companyId,
    ownerType: payload.ownerType,
    ownerId: payload.ownerId,
    category: payload.category,
    extension
  });

  const sql = `
    INSERT INTO attachments (
      company_id,
      public_id,
      owner_type,
      owner_id,
      category,
      storage_provider,
      bucket_name,
      object_key,
      mime_type,
      file_extension,
      size_bytes,
      visibility,
      status,
      uploaded_by_company_user_id
    )
    VALUES (
      :companyId,
      :publicId,
      :ownerType,
      :ownerId,
      :category,
      'S3',
      :bucket,
      :objectKey,
      :mimeType,
      :extension,
      :sizeBytes,
      'PRIVATE',
      'UPLOADING',
      :companyUserId
    )
  `;

  const [insertResult] = await db.execute(sql, {
    companyId,
    publicId,
    ownerType: payload.ownerType,
    ownerId: payload.ownerId,
    category: payload.category,
    bucket: env.aws.bucket,
    objectKey,
    mimeType: payload.mimeType,
    extension,
    sizeBytes: payload.sizeBytes,
    companyUserId: auth.companyUserId || null
  });

  const uploadUrl = await s3.createUploadUrl({
    bucket: env.aws.bucket,
    key: objectKey,
    contentType: payload.mimeType,
    expiresIn: env.aws.presignedUrlTtlSeconds
  });

  return {
    id: insertResult.insertId,
    publicId,
    requiredPermission: selectUploadPermission(payload.category),
    bucket: env.aws.bucket,
    objectKey,
    uploadUrl,
    expiresInSeconds: env.aws.presignedUrlTtlSeconds
  };
}

async function confirmUpload({ companyId, id, checksumSha256 }) {
  const row = await getAttachmentById({ companyId, id });
  if (!row) {
    return null;
  }

  const exists = await s3.objectExists({ bucket: row.bucket_name, key: row.object_key });
  if (!exists) {
    throw new Error('Object not found in S3. Upload must complete before confirmation.');
  }

  await db.execute(
    `
      UPDATE attachments
      SET
        status = 'ACTIVE',
        checksum_sha256 = COALESCE(:checksumSha256, checksum_sha256),
        updated_at = CURRENT_TIMESTAMP
      WHERE company_id = :companyId
        AND id = :id
    `,
    { companyId, id, checksumSha256: checksumSha256 || null }
  );

  const [updatedRows] = await db.execute(
    `SELECT * FROM attachments WHERE company_id = :companyId AND id = :id LIMIT 1`,
    { companyId, id }
  );

  return toAttachmentResponse(updatedRows[0]);
}

async function abortUpload({ companyId, id, reason, companyUserId }) {
  const row = await getAttachmentById({ companyId, id });
  if (!row) {
    return null;
  }

  if (row.status !== 'UPLOADING') {
    return toAttachmentResponse(row);
  }

  await db.execute(
    `
      UPDATE attachments
      SET
        status = 'REJECTED',
        review_notes = COALESCE(:reason, review_notes),
        reviewed_by_company_user_id = COALESCE(reviewed_by_company_user_id, :companyUserId),
        reviewed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE company_id = :companyId
        AND id = :id
    `,
    {
      companyId,
      id,
      reason: reason || null,
      companyUserId: companyUserId || null
    }
  );

  const updated = await getAttachmentById({ companyId, id });
  return updated ? toAttachmentResponse(updated) : null;
}

async function getDownloadUrl({ companyId, id }) {
  const [rows] = await db.execute(
    `SELECT * FROM attachments WHERE company_id = :companyId AND id = :id AND status = 'ACTIVE' AND deleted_at IS NULL LIMIT 1`,
    { companyId, id }
  );

  const row = rows[0];
  if (!row) {
    return null;
  }

  const downloadUrl = await s3.createDownloadUrl({
    bucket: row.bucket_name,
    key: row.object_key,
    expiresIn: env.aws.presignedUrlTtlSeconds
  });

  return {
    id: row.id,
    category: row.category,
    requiredPermission: selectViewPermission(row.category),
    downloadUrl,
    expiresInSeconds: env.aws.presignedUrlTtlSeconds
  };
}

async function listFiles({ companyId, ownerType, ownerId, category }) {
  const categoryFilter = category ? ' AND category = :category' : '';
  const sql = `
    SELECT *
    FROM attachments
    WHERE company_id = :companyId
      AND owner_type = :ownerType
      AND owner_id = :ownerId
      AND deleted_at IS NULL
      ${categoryFilter}
    ORDER BY id DESC
  `;

  const [rows] = await db.execute(sql, {
    companyId,
    ownerType,
    ownerId,
    category
  });

  return rows.map(toAttachmentResponse);
}

async function removeFile({ companyId, id, companyUserId }) {
  const [rows] = await db.execute(
    `SELECT * FROM attachments WHERE company_id = :companyId AND id = :id AND deleted_at IS NULL LIMIT 1`,
    { companyId, id }
  );

  if (!rows[0]) {
    return false;
  }

  await db.execute(
    `
      UPDATE attachments
      SET
        status = 'DELETED',
        deleted_at = CURRENT_TIMESTAMP,
        reviewed_by_company_user_id = COALESCE(reviewed_by_company_user_id, :companyUserId),
        updated_at = CURRENT_TIMESTAMP
      WHERE company_id = :companyId
        AND id = :id
    `,
    {
      companyId,
      id,
      companyUserId: companyUserId || null
    }
  );

  return true;
}

async function reviewFile({ companyId, id, companyUserId, decision, notes }) {
  const [rows] = await db.execute(
    `SELECT * FROM attachments WHERE company_id = :companyId AND id = :id AND deleted_at IS NULL LIMIT 1`,
    { companyId, id }
  );

  const row = rows[0];
  if (!row) {
    return null;
  }

  const nextStatus = decision === 'approve' ? 'ACTIVE' : 'REJECTED';
  await db.execute(
    `
      UPDATE attachments
      SET
        status = :nextStatus,
        reviewed_by_company_user_id = :companyUserId,
        reviewed_at = CURRENT_TIMESTAMP,
        review_notes = :notes,
        updated_at = CURRENT_TIMESTAMP
      WHERE company_id = :companyId
        AND id = :id
    `,
    {
      nextStatus,
      companyUserId,
      notes: notes || null,
      companyId,
      id
    }
  );

  const [updatedRows] = await db.execute(
    `SELECT * FROM attachments WHERE company_id = :companyId AND id = :id LIMIT 1`,
    { companyId, id }
  );

  return toAttachmentResponse(updatedRows[0]);
}

module.exports = {
  selectUploadPermission,
  selectViewPermission,
  getAttachmentById,
  createUploadUrl,
  confirmUpload,
  abortUpload,
  getDownloadUrl,
  listFiles,
  removeFile,
  reviewFile
};
