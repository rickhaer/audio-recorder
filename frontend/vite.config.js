import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
    plugins: [vue(), basicSsl()],
    server: {
        host: '0.0.0.0', // Allows Vite to listen on 0.0.0.0 inside Docker
        port: 5173,
        https: true,
        watch: {
            usePolling: true, // Polling mode to ensure changes are detected inside Docker
        }
    }
})
