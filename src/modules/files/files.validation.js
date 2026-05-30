const { z } = require('zod');
const env = require('../../config/env');

const OWNER_TYPES = ['USER', 'COMPANY_USER', 'CUSTOMER', 'LOAN_PAYMENT', 'COLLECTION_VISIT'];
const CATEGORIES = ['PROFILE_PHOTO', 'ID_FRONT', 'ID_BACK', 'SELFIE_VERIFICATION', 'SUPPORTING_DOCUMENT'];

const ALLOWED_MIME_TYPES_BY_CATEGORY = {
  PROFILE_PHOTO: ['image/jpeg', 'image/png', 'image/webp'],
  ID_FRONT: ['image/jpeg', 'image/png'],
  ID_BACK: ['image/jpeg', 'image/png'],
  SELFIE_VERIFICATION: ['image/jpeg', 'image/png'],
  SUPPORTING_DOCUMENT: ['image/jpeg', 'image/png', 'application/pdf']
};

const MAX_SIZE_BY_CATEGORY = {
  PROFILE_PHOTO: env.files.maxProfileBytes,
  ID_FRONT: env.files.maxIdBytes,
  ID_BACK: env.files.maxIdBytes,
  SELFIE_VERIFICATION: env.files.maxSelfieBytes,
  SUPPORTING_DOCUMENT: env.files.maxSupportBytes
};

const createUploadUrlSchema = z
  .object({
    ownerType: z.enum(OWNER_TYPES),
    ownerId: z.coerce.number().int().positive(),
    category: z.enum(CATEGORIES),
    mimeType: z.string().min(3).max(100),
    sizeBytes: z.coerce.number().int().positive(),
    originalFileName: z.string().min(1).max(255)
  })
  .superRefine((value, ctx) => {
    const allowedMimes = ALLOWED_MIME_TYPES_BY_CATEGORY[value.category] || [];
    if (!allowedMimes.includes(value.mimeType)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['mimeType'],
        message: 'mimeType not allowed for selected category.'
      });
    }

    const maxSize = MAX_SIZE_BY_CATEGORY[value.category] || 1;
    if (value.sizeBytes > maxSize) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['sizeBytes'],
        message: `sizeBytes exceeds max allowed size (${maxSize}).`
      });
    }
  });

const confirmUploadSchema = z.object({
  id: z.coerce.number().int().positive(),
  checksumSha256: z.string().length(64).optional()
});

const listFilesSchema = z.object({
  ownerType: z.enum(OWNER_TYPES),
  ownerId: z.coerce.number().int().positive(),
  category: z.enum(CATEGORIES).optional()
});

const reviewFileSchema = z.object({
  decision: z.enum(['approve', 'reject']),
  notes: z.string().max(500).optional()
});

module.exports = {
  createUploadUrlSchema,
  confirmUploadSchema,
  listFilesSchema,
  reviewFileSchema
};
