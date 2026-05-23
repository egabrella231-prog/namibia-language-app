const { Pool } = require('@neondatabase/serverless');

// Replace with your full connection string
const connectionString = "postgresql://neondb_owner:npg_96JtlhMbqyBA@ep-raspy-fire-abaio495-pooler.eu-west-2.aws.neon.tech/neondb";

const pool = new Pool({
  connectionString: connectionString,
});

async function testConnection() {
  try {
    console.log("Attempting to connect via HTTP Proxy...");
    const client = await pool.connect();
    console.log("✅ Success! Connected via Proxy.");
    client.release();
  } catch (err) {
    console.error("❌ Connection failed. Detailed error below:");
    console.error(err);
  } finally {
    await pool.end();
  }
}

testConnection();
