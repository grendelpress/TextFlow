import { schedule } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const handler = schedule('0 0 */3 * *', async () => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing configuration' }),
    };
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { count, error } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('Keep-alive query error:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message }),
      };
    }

    const timestamp = new Date().toISOString();
    console.log(`Keep-alive ping successful at ${timestamp}. Profiles count: ${count}`);
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        timestamp,
        profilesCount: count,
        message: 'Keep-alive ping successful',
      }),
    };
  } catch (error) {
    console.error('Keep-alive function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: String(error) }),
    };
  }
});

export { handler };
