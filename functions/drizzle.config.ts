import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

// .envファイルを読み込む
dotenv.config();

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});