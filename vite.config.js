import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { localDevApiPlugin } from './vite-plugin-local-api.js'

export default defineConfig({
  plugins: [react(), localDevApiPlugin()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
})
