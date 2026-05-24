import { neon } from '@neondatabase/serverless';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';

    if (!process.env.DATABASE_URL) {
      return Response.json({ success: false, error: "DATABASE_URL is not defined" }, { status: 500 });
    }

    // Connect to Neon SQL Cluster
    const sql = neon(process.env.DATABASE_URL);

    // 1. Search existing entries
    const results = await sql`
      SELECT native_word, grammatical_type, english_translation 
      FROM oshikwanyama_dictionary 
      WHERE LOWER(native_word) = LOWER(${search}) 
         OR LOWER(english_translation) LIKE LOWER(${'%' + search + '%'})
      LIMIT 1;
    `;

    if (results.length > 0) {
      return Response.json({ success: true, record: results[0] });
    }

    // 2. Pass to your Automated Linguistic Rule function inside Neon
    const generatedWord = await sql`
      SELECT generate_linguistic_word('oku-', ${search}) as word;
    `;

    if (generatedWord.length > 0 && generatedWord[0].word) {
      return Response.json({ 
        success: true, 
        record: {
          native_word: generatedWord[0].word,
          grammatical_type: 'Generated Rule (Infinitive)',
          english_translation: 'Dynamic compilation active'
        } 
      });
    }

    return Response.json({ success: false, record: null });
  } catch (error: any) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}