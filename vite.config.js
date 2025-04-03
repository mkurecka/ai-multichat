import { defineConfig } from "vite";
import symfonyPlugin from "vite-plugin-symfony";
import path from 'path';

export default defineConfig({
    plugins: [
        symfonyPlugin(),
    ],
    resolve: {
        alias: {
            '@symfony/stimulus-bundle': path.resolve(__dirname, 'vendor/symfony/stimulus-bundle/assets/dist/loader.js'),
        }
    },
    build: {
        rollupOptions: {
            input: {
                app: "./assets/app.js"
            },
        }
    },
    server: {
        port: 5173,
        https: false,
        hmr: {
            host: 'localhost',
        },
        watch: {
            usePolling: true
        }
    }
});