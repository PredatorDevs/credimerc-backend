const { z } = require('zod');

const registerSchema = z.object({
  email: z.string().email().max(150),
  password: z.string().min(8).max(128),
  fullName: z.string().min(2).max(200),
  phone: z.string().max(30).optional()
});

const loginSchema = z.object({
  email: z.string().email().max(150),
  password: z.string().min(8).max(128)
});

const refreshSchema = z.object({
  refreshToken: z.string().min(20).max(512)
});

const logoutSchema = refreshSchema;

const selectCompanySchema = z.object({
  companyId: z.coerce.number().int().positive()
});

const forgotPasswordSchema = z.object({
  email: z.string().email().max(150)
});

const resetPasswordSchema = z.object({
  token: z.string().min(20).max(512),
  newPassword: z.string().min(8).max(128)
});

module.exports = {
  registerSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
  selectCompanySchema,
  forgotPasswordSchema,
  resetPasswordSchema
};
