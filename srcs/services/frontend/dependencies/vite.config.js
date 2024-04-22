import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src',
  define: {
    'process.env': process.env
  },
  server: {
    https: {
        key: '/etc/ssl/private/selfsigned.key',
        cert: '/etc/ssl/private/selfsigned.crt',
    },
    fs: {
      strict: false
    },
    base: './',
    watch: {
      usePolling: true
    },
    rewrite: (path) => {
      if (path.match(/^\/match\/[a-zA-Z0-9]+$/)) {
        return '/index.html';
      }
    }
  },
  optimizeDeps: {
    include: ['jquery'],
  },
});
