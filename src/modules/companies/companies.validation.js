const { z } = require('zod');

const createCompanySchema = z.object({
  name: z.string().min(2).max(200),
  commercialName: z.string().max(200).optional(),
  legalName: z.string().max(200).optional(),
  nit: z.string().max(30).optional(),
  nrc: z.string().max(30).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email().max(150).optional(),
  address: z.string().max(500).optional()
});

module.exports = {
  createCompanySchema
};
