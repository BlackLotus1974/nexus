import * as fs from 'fs';
import * as path from 'path';

try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
        console.log('.env.local exists');
        const envConfig = fs.readFileSync(envPath, 'utf8');
        envConfig.split('\n').forEach((line) => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim().replace(/^["']|["']$/g, '');
                if (key.includes('SUPABASE')) {
                    console.log(`${key}: ${value.substring(0, 8)}... (Length: ${value.length})`);
                }
            }
        });
    } else {
        console.log('.env.local does NOT exist');
    }
} catch (e) {
    console.error('Error reading .env.local', e);
}
