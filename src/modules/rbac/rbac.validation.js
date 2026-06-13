const { z } = require('zod');

const ROLE_STATUS = ['ACTIVE', 'INACTIVE'];

const listPermissionsQuerySchema = z.object({
  q: z.string().max(100).optional(),
  activeOnly: z.coerce.boolean().optional()
});

const listRolesQuerySchema = z.object({
  status: z.enum(ROLE_STATUS).optional()
});

const createRoleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(255).optional(),
  status: z.enum(ROLE_STATUS).optional()
});

const updateRoleSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(255).optional(),
    status: z.enum(ROLE_STATUS).optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided for update.'
  });

const setRolePermissionsSchema = z.object({
  permissionIds: z.array(z.coerce.number().int().positive()).max(300)
});

const setCompanyUserRolesSchema = z.object({
  roleIds: z.array(z.coerce.number().int().positive()).max(100)
});

module.exports = {
  listPermissionsQuerySchema,
  listRolesQuerySchema,
  createRoleSchema,
  updateRoleSchema,
  setRolePermissionsSchema,
  setCompanyUserRolesSchema
};
