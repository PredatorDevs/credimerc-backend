const { z } = require('zod');

const COMPANY_USER_STATUS = ['ACTIVE', 'INACTIVE', 'INVITED', 'REMOVED'];

const inviteCompanyUserSchema = z.object({
  email: z.string().email().max(150),
  fullName: z.string().min(2).max(200).optional(),
  phone: z.string().max(30).optional(),
  employeeCode: z.string().max(50).optional(),
  jobTitle: z.string().max(100).optional(),
  isOwner: z.boolean().optional(),
  status: z.enum(['INVITED', 'ACTIVE']).optional()
});

const updateCompanyUserSchema = z
  .object({
    employeeCode: z.string().max(50).optional(),
    jobTitle: z.string().max(100).optional(),
    isOwner: z.boolean().optional(),
    status: z.enum(COMPANY_USER_STATUS).optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided for update.'
  });

const listCompanyUsersQuerySchema = z.object({
  q: z.string().max(200).optional(),
  status: z.enum(COMPANY_USER_STATUS).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional()
});

module.exports = {
  inviteCompanyUserSchema,
  updateCompanyUserSchema,
  listCompanyUsersQuerySchema
};
