import fs from "fs";
import path from "path";

export const writeFile = (fileName: string, text: string): void => {
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const filePath = path.join(dataDir, fileName);
  fs.writeFileSync(filePath, text, "utf-8");
  console.log("数据已保存:", filePath);
};
export const readFile = (fileName: string): string => {
  const dataDir = path.join(process.cwd(), "data");
  const filePath = path.join(dataDir, fileName);
  return fs.readFileSync(filePath, "utf-8");
};
