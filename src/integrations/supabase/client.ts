import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ktdhzfavmpfkcrwahdvm.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Of_g0z8uU8DIQVsv1m8QLQ_iM_qeuLF";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
