import { defineConfig } from "vite";
import symfonyPlugin from "vite-plugin-symfony";
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => ({
    plugins: [
        react(),
        symfonyPlugin({
            buildDirectory: 'build',
            publicDirectory: 'public',
            refresh: true,
        }),
    ],
    optimizeDeps: {
        exclude: ['lucide-react'],
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './assets/react'),
        },
        extensions: ['.tsx', '.ts', '.jsx', '.js', '.json']
    },
    build: {
        manifest: true,
        rollupOptions: {
            input: {
                app: path.resolve(__dirname, 'assets/react/index.tsx')
            }
        }
    },
    base: mode === 'production' ? '/build/' : '/app/'
}));
