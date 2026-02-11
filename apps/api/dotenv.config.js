import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load root .env file first
config({ path: resolve(__dirname, '../../.env') });

// Then load local .env to allow overrides
config({ path: resolve(__dirname, '.env'), override: false });

console.log('✅ Loaded environment variables from root .env');
