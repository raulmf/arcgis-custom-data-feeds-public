import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";

const calciteCdn = path.resolve(__dirname, "../node_modules/@esri/calcite-components/dist/cdn");
const calciteAssets = path.resolve(calciteCdn, "assets");

function sendFileIfPresent(root: string, requestPath: string, res: any, next?: () => void) {
  const filePath = path.resolve(root, requestPath);
  if (!filePath.startsWith(root) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    if (next) {
      next();
      return;
    }

    res.statusCode = 404;
    res.end();
    return;
  }

  fs.createReadStream(filePath).pipe(res);
}

function calciteAssetsPlugin() {
  return {
    name: "local-calcite-assets",
    configureServer(server: any) {
      server.middlewares.use("/calcite", (req: any, res: any) => {
        const requestPath = decodeURIComponent((req.url ?? "").split("?")[0]).replace(/^\/+/, "");
        sendFileIfPresent(calciteCdn, requestPath, res);
      });
      server.middlewares.use("/assets", (req: any, res: any, next: () => void) => {
        const requestPath = decodeURIComponent((req.url ?? "").split("?")[0]).replace(/^\/+/, "");
        sendFileIfPresent(calciteAssets, requestPath, res, next);
      });
    },
    writeBundle() {
      fs.cpSync(calciteCdn, path.resolve(__dirname, "dist/calcite"), { recursive: true });
      fs.cpSync(calciteAssets, path.resolve(__dirname, "dist/assets"), { recursive: true });
    }
  };
}

export default defineConfig({
  envDir: "..",
  plugins: [react(), calciteAssetsPlugin()],
  server: {
    proxy: {
      "/api": "http://127.0.0.1:4000"
    }
  }
});
