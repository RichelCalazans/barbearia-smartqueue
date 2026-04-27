import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv, type UserConfig} from 'vite';

type VitestUserConfig = UserConfig & {
  test: {
    environment: 'happy-dom';
    setupFiles: string;
    globals: boolean;
  };
};

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const config: VitestUserConfig = {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify(env.VITE_FIREBASE_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
            'vendor-motion': ['motion/react'],
          },
        },
      },
    },
    test: {
      environment: 'happy-dom',
      setupFiles: './src/test/setup.ts',
      globals: true,
    },
  };
  return config;
});
