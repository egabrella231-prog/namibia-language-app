const { Pool, neonConfig } = require('@neondatabase/serverless');

// Use the fetch API which is native and often bypasses port restrictions
neonConfig.fetchConnectionCache = true;

const pool = new Pool({
  connectionString: "postgresql://neondb_owner:npg_96JtlhMbqyBA@ep-raspy-fire-abaio495-pooler.eu-west-2.aws.neon.tech/neondb",
});

async function runTest() {
  try {
    console.log("Attempting to connect via Fetch...");
    const client = await pool.connect();
    console.log("✅ Success! Database connected.");
    client.release();
  } catch (err) {
    console.error("❌ Connection failed:");
    console.error(err.message);
  } finally {
    await pool.end();
  }
}
runTest();
