import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { host:'127.0.0.1', port:5173, strictPort:true, proxy:{ '/api':'http://127.0.0.1:3001', '/socket.io':{target:'http://127.0.0.1:3001',ws:true} } },
  build: { rollupOptions: { output: { manualChunks: { phaser:['phaser'] } } } },
})
