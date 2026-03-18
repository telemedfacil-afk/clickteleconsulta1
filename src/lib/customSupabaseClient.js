import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hlzwknxrlgmffdcyzsoj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsendrbnhybGdtZmZkY3l6c29qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMTc4NDQsImV4cCI6MjA3MTc5Mzg0NH0.UtLywUXVPdTgmWVWorbkWGxGHaMg1zziIU3x-GTpGhc';

const customSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default customSupabaseClient;

export { 
    customSupabaseClient,
    customSupabaseClient as supabase,
};
