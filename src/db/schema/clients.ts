import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users';

export const clients = pgTable('clients', {
  id: uuid('id').primaryKey().defaultRandom(),

  /** Client organization name. */
  name: text('name').notNull(),

  /** Brief description of the client. */
  description: text('description'),

  /** Primary contact name. */
  contactName: text('contact_name'),

  /** Primary contact email. */
  contactEmail: text('contact_email'),

  /** Primary contact phone. */
  contactPhone: text('contact_phone'),

  /** Client's website. */
  website: text('website'),

  /** Client's industry/sector. */
  industry: text('industry'),

  /** Client's logo URL. */
  logoUrl: text('logo_url'),

  /** Billing address. */
  billingAddress: jsonb('billing_address').$type<{
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  }>(),

  /** Custom metadata for the client. */
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),

  /** Notes about the client (internal only). */
  notes: text('notes'),

  // Standard timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  nameIdx: index('clients_name_idx').on(table.name),
  deletedIdx: index('clients_deleted_idx').on(table.deletedAt),
}));

/** Links users to clients they have access to. */
export const clientUsers = pgTable('client_users', {
  id: uuid('id').primaryKey().defaultRandom(),

  /** Client organization. */
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),

  /** User with access to this client. */
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  /** Whether this user is the primary contact. */
  isPrimary: text('is_primary').notNull().default('false'),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  clientIdx: index('client_users_client_idx').on(table.clientId),
  userIdx: index('client_users_user_idx').on(table.userId),
}));
