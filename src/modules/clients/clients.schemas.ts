import { z } from 'zod';

export const createClientSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(200),
    description: z.string().optional(),
    contactName: z.string().optional(),
    contactEmail: z.string().email().optional(),
    contactPhone: z.string().optional(),
    website: z.string().url().optional(),
    industry: z.string().optional(),
    notes: z.string().optional(),
    billingAddress: z.object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional(),
    }).optional(),
  }),
});

export type CreateClientInput = z.infer<typeof createClientSchema>['body'];

export const updateClientSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().nullable().optional(),
    contactName: z.string().nullable().optional(),
    contactEmail: z.string().email().nullable().optional(),
    contactPhone: z.string().nullable().optional(),
    website: z.string().url().nullable().optional(),
    industry: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    billingAddress: z.object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional(),
    }).nullable().optional(),
  }),
});

export type UpdateClientInput = z.infer<typeof updateClientSchema>;

export const listClientsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
});

export const getClientSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});
