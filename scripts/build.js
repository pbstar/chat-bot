import {
  copyFileSync,
  mkdirSync,
  readdirSync,
  statSync,
  readFileSync,
  writeFileSync,
} from "fs";
import { join, dirname, extname } from "path";
import { fileURLToPath } from "url";
import { minify } from "terser";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const distDir = join(rootDir, "dist");

function copyRecursive(src, dest) {
  const stat = statSync(src);
  if (stat.isDirectory()) {
    mkdirSync(dest, { recursive: true });
    const files = readdirSync(src);
    for (const file of files) {
      copyRecursive(join(src, file), join(dest, file));
    }
  } else {
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(src, dest);
  }
}

async function minifyJsFiles(dir) {
  const files = readdirSync(dir);
  for (const file of files) {
    const fullPath = join(dir, file);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      await minifyJsFiles(fullPath);
    } else if (extname(file) === ".js") {
      try {
        const code = readFileSync(fullPath, "utf-8");
        const result = await minify(code, {
          compress: {
            drop_console: false,
            dead_code: true,
            unused: true,
          },
          mangle: true,
          format: {
            comments: false,
          },
        });

        if (result.code) {
          writeFileSync(fullPath, result.code);
          console.log(`Minified: ${file}`);
        }
      } catch (error) {
        console.error(`Failed to minify ${file}:`, error.message);
      }
    }
  }
}

copyRecursive(join(rootDir, "public"), join(distDir, "public"));
console.log("Build copy completed!");

console.log("\nMinifying JavaScript files...");
await minifyJsFiles(distDir);
console.log("Build minification completed!");
