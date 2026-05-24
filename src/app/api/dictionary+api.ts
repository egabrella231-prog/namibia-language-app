import { neon } from '@neondatabase/serverless';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const word = searchParams.get('search');

  if (!word) {
    return Response.json({ success: false, error: "No search term" }, { status: 400 });
  }

  try {
    // Check if env variable is loaded
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is missing.");
    }

    const sql = neon(process.env.DATABASE_URL);
    
    // Query your table - verified from your screenshots
    const result = await sql`
      SELECT * FROM "bidirectional_voice_dictionary" 
      WHERE "kwanyama_text" ILIKE ${'%' + word + '%'} 
      LIMIT 1
    `;

    return Response.json({ success: true, record: result[0] || null });
  } catch (error: any) {
    console.error("API Error:", error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}