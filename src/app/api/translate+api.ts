import { ExpoRequest, ExpoResponse } from 'expo-router/server';
import { Client } from 'pg';

// Initialize the database connection client using your environment variables
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Required for secure cloud hosting platforms
});

client.connect().catch(err => console.error("Database connection fault:", err));

export async function GET(request: ExpoRequest): Promise<ExpoResponse> {
  const url = new URL(request.url);
  const word = url.searchParams.get('word')?.trim().toLowerCase();
  const mode = url.searchParams.get('mode'); // "osh-to-eng" or "eng-to-osh"

  if (!word) {
    return ExpoResponse.json({ error: 'Search keyword is blank' }, { status: 400 });
  }

  try {
    let queryText = '';
    let queryValues = [word];

    if (mode === 'osh-to-eng') {
      // Query searching by the Oshikwanyama column matching standard orthography
      queryText = 'SELECT english, oshikwanjama, audio_url FROM dictionary WHERE LOWER(oshikwanjama) = $1 LIMIT 1;';
    } else {
      // Query searching by the English column
      queryText = 'SELECT english, oshikwanjama, audio_url FROM dictionary WHERE LOWER(english) = $1 LIMIT 1;';
    }

    const result = await client.query(queryText, queryValues);

    if (result.rows.length > 0) {
      return ExpoResponse.json(result.rows[0]);
    } else {
      return ExpoResponse.json({ notFound: true, message: 'Word not found in database registry' });
    }
  } catch (error: any) {
    return ExpoResponse.json({ error: error.message }, { status: 500 });
  }
}