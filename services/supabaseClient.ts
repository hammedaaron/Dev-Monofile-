import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zksucxlexblutbyydcca.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_zCT8p4N_yMshdoYrrhxJMw_RTnSuPPQ';

// Initializing the Supabase client with the new project credentials.
// The publishable key is used to allow secure, client-side access to the database.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
