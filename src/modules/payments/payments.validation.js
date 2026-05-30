const { z } = require('zod');

const PAYMENT_METHODS = ['CASH', 'BANK_TRANSFER', 'CARD', 'MOBILE_WALLET', 'OTHER'];

const createPaymentSchema = z.object({
  amount: z.coerce.number().positive(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  referenceNumber: z.string().max(100).optional(),
  notes: z.string().max(5000).optional(),
  collectorCompanyUserId: z.coerce.number().int().positive().optional(),
  paymentDate: z.string().datetime({ offset: true }).optional()
});

const voidPaymentSchema = z.object({
  reason: z.string().min(5).max(500)
});

module.exports = {
  createPaymentSchema,
  voidPaymentSchema
};
