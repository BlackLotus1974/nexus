import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Manually load .env.local
try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf8');
        envConfig.split('\n').forEach((line) => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim().replace(/^["']|["']$/g, '');
                process.env[key] = value;
            }
        });
        console.log('.env.local loaded');
    } else {
        console.warn('.env.local not found');
    }
} catch (e) {
    console.error('Error loading .env.local', e);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Testing Supabase Connection...');
console.log('URL:', supabaseUrl ? supabaseUrl.replace(/^(https?:\/\/[^.]+).+$/, '$1...') : 'Missing');
console.log('Key:', supabaseKey ? (supabaseKey.substring(0, 5) + '...') : 'Missing');



if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing environment variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    try {
        console.log('Environment check:');
        console.log('fetch available:', typeof fetch !== 'undefined');

        if (supabaseUrl) {
            console.log('Testing reachability of Supabase URL...');
            try {
                const res = await fetch(supabaseUrl);
                console.log('Fetch Supabase URL status:', res.status);
            } catch (e) {
                console.error('Fetch Supabase URL failed:', (e as Error).message);
            }
        }

        console.log('Attempting to connect to Supabase...');

        // 1. Test Auth Connection (usually doesn't require RLS)
        console.log('1. Testing Auth Connection (getSession)...');
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
            console.error('Auth Connection Failed:', sessionError.message);
            console.error('Full Error:', JSON.stringify(sessionError, null, 2));
        } else {
            console.log('Auth Connection Successful. Session exists:', !!sessionData.session);
        }

        // 2. Test SignUp (Verification of Signup Flow)
        console.log('2. Testing SignUp...');
        const testEmail = `test-${Date.now()}@example.com`;
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: testEmail,
            password: 'password123',
        });

        if (authError) {
            console.error('SignUp Failed:', authError.message);
            console.error('Full Error:', JSON.stringify(authError, null, 2));
        } else {
            console.log('SignUp Successful!');
            console.log('User ID:', authData.user?.id);
            console.log('Is New User:', authData.user?.created_at === authData.user?.last_sign_in_at);

            console.log('Note: Created test user', testEmail);
        }

    } catch (err) {
        console.error('Unexpected error during test:', err);
        if (err instanceof Error) {
            console.error('Stack:', err.stack);
        }
    }
}

testConnection();
