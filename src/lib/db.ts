import { Pool } from '@neondatabase/serverless';

// The connection string is pulled from your .env file
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined in environment variables");
}

export const pool = new Pool({
  connectionString: connectionString,
});
