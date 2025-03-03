// pages/_app.js
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client (moved here to share across app)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />;
}