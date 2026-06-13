const { z } = require('zod');

const dateRangeQuerySchema = z
  .object({
    from: z.string().date().optional(),
    to: z.string().date().optional()
  })
  .superRefine((value, ctx) => {
    if (value.from && value.to && value.from > value.to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['to'],
        message: 'to must be greater than or equal to from.'
      });
    }
  });

const overdueLoansQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(200).optional()
});

const dailyPaymentsQuerySchema = dateRangeQuerySchema;
const collectorPaymentsQuerySchema = dateRangeQuerySchema;

module.exports = {
  dateRangeQuerySchema,
  overdueLoansQuerySchema,
  dailyPaymentsQuerySchema,
  collectorPaymentsQuerySchema
};
