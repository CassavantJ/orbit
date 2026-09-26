import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Clear of the hub (5180) and Vite's default (5173); moves up if taken.
  server: { port: 5190 },
});
