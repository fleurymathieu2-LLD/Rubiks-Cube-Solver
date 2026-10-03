import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// One self-contained index.html: easy to host anywhere and works offline.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  base: './',
});
