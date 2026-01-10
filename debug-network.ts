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
    }
} catch (e) {
    console.error('Error loading .env.local', e);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
console.log('Testing URL:', url);

if (!url) {
    console.error('No URL found');
    process.exit(1);
}

async function test() {
    try {
        console.log('Fetching...');
        const res = await fetch(url);
        console.log('Status:', res.status);
        console.log('StatusText:', res.statusText);
        const text = await res.text();
        console.log('Body length:', text.length);
        console.log('Body preview:', text.substring(0, 200));
    } catch (e: any) {
        console.error('Fetch failed:', e.message);
        console.error('Cause:', e.cause);
    }
}

test();
