import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const logDir = path.join(process.cwd(), 'logs');
export const assetsDir = path.join(process.cwd(), 'assets');
export const cmdsDir = path.join(__dirname, 'commands');
