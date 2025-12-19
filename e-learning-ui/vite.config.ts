import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Try to remove /api suffix for the proxy target if it exists, as proxy maps /api -> target/api
  const target = env.VITE_API_BASE_URL?.replace(/\/api\/?$/, '') || env.VITE_API_BASE_URL;

  return {
    server: {
      host: "::",
      port: 8080,
      proxy: {
        // Forward /api requests to Django backend to avoid CORS and hard-coded ports during dev
        "/api": {
          target: target,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    plugins: [
      react(),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
