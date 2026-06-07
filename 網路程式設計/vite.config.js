import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      // 允許 Vite 讀取專案上一層的檔案
      allow: ['..']
    }
  }
})