import { neon } from '@neondatabase/serverless';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const word = searchParams.get('search');

  // Hardcoded for absolute reliability
  const DATABASE_URL = process.env.DATABASE_URL;

  if (!DATABASE_URL) {
    return Response.json({ success: false, error: "Database URL not found in environment" }, { status: 500 });
  }

  try {
    const sql = neon(DATABASE_URL);
    
    // We are querying your table directly
    const result = await sql`
      SELECT * FROM "bidirectional_voice_dictionary" 
      WHERE "kwanyama_text" ILIKE ${'%' + (word || '') + '%'} 
      LIMIT 1
    `;

    return Response.json({ success: true, record: result[0] || null });
  } catch (error: any) {
    console.error("DEBUG ERROR:", error);
    return Response.json({ success: false, error: "Database Error: " + error.message }, { status: 500 });
  }
}