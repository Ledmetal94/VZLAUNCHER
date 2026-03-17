import { z } from 'zod'

export const createOperatorSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50)
    .regex(/^[a-z0-9]+$/, 'Username must be lowercase alphanumeric'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100),
  role: z.enum(['admin', 'normal']),
})

export const updateOperatorSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(50).optional(),
    role: z.enum(['admin', 'normal']).optional(),
    password: z.string().min(6, 'Password must be at least 6 characters').max(100).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  })

export type CreateOperatorInput = z.infer<typeof createOperatorSchema>
export type UpdateOperatorInput = z.infer<typeof updateOperatorSchema>
