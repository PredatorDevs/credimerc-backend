const { z } = require('zod');

const DOCUMENT_TYPES = ['DUI', 'NIT', 'PASSPORT', 'OTHER'];
const CUSTOMER_STATUS = ['ACTIVE', 'INACTIVE', 'BLOCKED'];

const baseCustomer = {
  code: z.string().max(50).optional(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().max(100).optional(),
  documentType: z.enum(DOCUMENT_TYPES).optional(),
  documentNumber: z.string().max(50).optional(),
  phone: z.string().max(30).optional(),
  secondaryPhone: z.string().max(30).optional(),
  email: z.string().email().max(150).optional(),
  businessName: z.string().max(200).optional(),
  businessType: z.string().max(100).optional(),
  marketName: z.string().max(150).optional(),
  marketSector: z.string().max(100).optional(),
  stallNumber: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  notes: z.string().max(5000).optional(),
  status: z.enum(CUSTOMER_STATUS).optional()
};

const createCustomerSchema = z.object(baseCustomer);

const updateCustomerSchema = z
  .object({
    code: z.string().max(50).optional(),
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().max(100).optional(),
    documentType: z.enum(DOCUMENT_TYPES).optional(),
    documentNumber: z.string().max(50).optional(),
    phone: z.string().max(30).optional(),
    secondaryPhone: z.string().max(30).optional(),
    email: z.string().email().max(150).optional(),
    businessName: z.string().max(200).optional(),
    businessType: z.string().max(100).optional(),
    marketName: z.string().max(150).optional(),
    marketSector: z.string().max(100).optional(),
    stallNumber: z.string().max(50).optional(),
    address: z.string().max(500).optional(),
    notes: z.string().max(5000).optional(),
    status: z.enum(CUSTOMER_STATUS).optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided for update.'
  });

const listCustomersQuerySchema = z.object({
  q: z.string().max(200).optional(),
  status: z.enum(CUSTOMER_STATUS).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional()
});

module.exports = {
  createCustomerSchema,
  updateCustomerSchema,
  listCustomersQuerySchema
};
