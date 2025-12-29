import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';
import { config } from '../config/index.js';

const connectionString = config.database.url;

// Connection pool settings
const client = postgres(connectionString, {
  max: 10,                    // Max connections in pool
  idle_timeout: 20,           // Close idle connections after 20s
  connect_timeout: 10,        // Timeout for new connections
});

export const db = drizzle(client, {
  schema,
  logger: config.env === 'development',
});

export { schema };
