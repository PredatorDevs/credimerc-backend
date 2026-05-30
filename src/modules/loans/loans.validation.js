const { z } = require('zod');

const LOAN_STATUS = ['ACTIVE', 'PAID', 'OVERDUE', 'CANCELLED'];

const createLoanSchema = z
  .object({
    customerId: z.coerce.number().int().positive(),
    principalAmount: z.coerce.number().positive(),
    interestRate: z.coerce.number().min(0),
    startDate: z.string().date(),
    dueDate: z.string().date()
  })
  .refine((value) => value.dueDate >= value.startDate, {
    message: 'dueDate must be greater than or equal to startDate.',
    path: ['dueDate']
  });

const updateLoanSchema = z
  .object({
    principalAmount: z.coerce.number().positive().optional(),
    interestRate: z.coerce.number().min(0).optional(),
    startDate: z.string().date().optional(),
    dueDate: z.string().date().optional(),
    status: z.enum(LOAN_STATUS).optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided for update.'
  })
  .superRefine((value, ctx) => {
    if (value.startDate && value.dueDate && value.dueDate < value.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dueDate'],
        message: 'dueDate must be greater than or equal to startDate.'
      });
    }
  });

const cancelLoanSchema = z.object({
  reason: z.string().min(5).max(500)
});

const listLoansQuerySchema = z.object({
  status: z.enum(LOAN_STATUS).optional(),
  customerId: z.coerce.number().int().positive().optional(),
  overdueOnly: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional()
});

module.exports = {
  createLoanSchema,
  updateLoanSchema,
  cancelLoanSchema,
  listLoansQuerySchema
};
