/**
 * Code Collector Script
 * ================================
 *
 * วิธีใช้งาน:
 * 1. ติดตั้ง Node.js และ TypeScript บนเครื่องของคุณ
 * 2. เปิด Terminal หรือ Command Prompt ในโฟลเดอร์ที่มีไฟล์สคริปต์นี้
 * 3. แก้ไขตัวแปร 'originalPaths' ให้ชี้ไปยังโฟลเดอร์ที่คุณต้องการรวบรวมโค้ด
 * 4. ติดตั้ง dependencies: npm install
 * 5. รันสคริปต์ด้วยคำสั่ง: npm start
 *
 * คำอธิบาย:
 * - สคริปต์นี้จะรวบรวมเนื้อหาของไฟล์โค้ดทั้งหมดในโฟลเดอร์ที่กำหนด
 * - สร้างโครงสร้างไฟล์ (file tree) ของโปรเจค
 * - รวมทั้งหมดเป็นไฟล์เดียวและเปิดในโปรแกรม TextEdit (macOS) หรือ Notepad (Windows)
 * - คัดลอกเนื้อหาไปยัง clipboard โดยอัตโนมัติ
 * - หลังจากปิดโปรแกรมแก้ไขข้อความ ไฟล์ผลลัพธ์จะถูกลบโดยอัตโนมัติ
 */

import * as fs from "fs";
import * as path from "path";
import { exec, spawn } from "child_process";
import * as os from "os";
import { promisify } from "util";
import clipboardy from "clipboardy";
import { fileURLToPath } from "url";

// กำหนด __dirname สำหรับ ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const allowedExtensions: string[] = [
  ".js",
  ".ts",
  ".java",
  ".py",
  ".jsx",
  ".tsx",
  ".go",
  ".sql",
  ".properties",
  ".yml",
  ".yaml",
  ".gradle",
  ".env",
];

const excludedFolders: string[] = [
  "node_modules",
  ".git",
  "build",
  "dist",
  ".config",
  "vendor",
  "target",
  "test",
  "vite",
  "deps",
  "deps_ssr"
];

const excludedFiles: string[] = [
  "postcss.config.js",
  "App.test.js",
  "setupTests.js",
];

const readdirAsync = promisify(fs.readdir);
const readFileAsync = promisify(fs.readFile);
const unlinkAsync = promisify(fs.unlink);

async function readFilesFromDirectory(
  directoryPath: string
): Promise<string[]> {
  let fileContents: string[] = [];

  try {
    const dirents = await readdirAsync(directoryPath, { withFileTypes: true });
    for (const dirent of dirents) {
      const filePath: string = path.join(directoryPath, dirent.name);

      if (dirent.isDirectory() && !excludedFolders.includes(dirent.name)) {
        const contents = await readFilesFromDirectory(filePath);
        fileContents = fileContents.concat(contents);
      } else if (
        (allowedExtensions.includes(path.extname(dirent.name)) ||
          dirent.name === ".env") &&
        !excludedFiles.includes(dirent.name) &&
        !dirent.name.includes(".test.") &&
        !dirent.name.includes("test")
      ) {
        try {
          let content: string = await readFileAsync(filePath, "utf8");
          let relativeFilePath: string = path.relative(process.cwd(), filePath);
          content = `// ${relativeFilePath}\n${content}`;
          fileContents.push(content);
        } catch (error) {
          console.error(`ไม่สามารถอ่านไฟล์ ${filePath}: ${error}`);
        }
      }
    }
  } catch (error) {
    console.error(`ไม่สามารถอ่านโฟลเดอร์ ${directoryPath}: ${error}`);
  }

  return fileContents;
}

async function generateFileTree(
  directoryPath: string,
  prefix: string = ""
): Promise<string> {
  let tree: string = "";

  try {
    const files = await readdirAsync(directoryPath, { withFileTypes: true });
    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      if (
        excludedFolders.includes(file.name) ||
        excludedFiles.includes(file.name)
      ) {
        continue;
      }

      const isLast: boolean = index === files.length - 1;
      const newPrefix: string = prefix + (isLast ? "    " : "|   ");
      const filePath: string = path.join(directoryPath, file.name);

      if (file.isDirectory()) {
        tree += prefix + (isLast ? "└── " : "├── ") + file.name + "\n";
        const subtree = await generateFileTree(filePath, newPrefix);
        tree += subtree;
      } else if (
        allowedExtensions.includes(path.extname(file.name)) ||
        file.name === ".env"
      ) {
        tree += prefix + (isLast ? "└── " : "├── ") + file.name + "\n";
      }
    }
  } catch (error) {
    console.error(`ไม่สามารถสร้าง File Tree จาก ${directoryPath}: ${error}`);
  }

  return tree;
}

function createPrompt(contents: string[], fileTree: string): string {
  return contents.join("\n\n\n") + "\n\n// File Tree:\n" + fileTree;
}

async function processDirectory(originalPath: string): Promise<string | null> {
  const directoryPath: string = originalPath.replace(/\\\\/g, "/");
  const fileTree: string = await generateFileTree(directoryPath);
  const fileContents: string[] = await readFilesFromDirectory(directoryPath);
  const prompt: string = createPrompt(fileContents, fileTree);
  const outputFile: string = path.join(
    __dirname,
    "Output_" + path.basename(directoryPath) + ".txt"
  );

  try {
    fs.writeFileSync(outputFile, prompt);
    // เพิ่มการคัดลอกเนื้อหาไปยัง clipboard
    await clipboardy.write(prompt);
    console.log("เนื้อหาถูกคัดลอกไปยัง clipboard แล้ว");
    return outputFile;
  } catch (error) {
    console.error(`ไม่สามารถเขียนไฟล์หรือคัดลอกเนื้อหา: ${error}`);
    return null;
  }
}

function handleOutputFile(outputFile: string): void {
  const platform: string = os.platform();

  if (platform === "darwin") {
    console.log(`เปิดไฟล์ ${outputFile} ด้วย TextEdit`);
    console.log("เนื้อหาถูกคัดลอกแล้ว คุณสามารถกด Command + V เพื่อวางได้");

    const openProcess = spawn("open", ["-a", "TextEdit", outputFile]);

    openProcess.on("close", async (code: number) => {
      console.log(`TextEdit ถูกปิดด้วยรหัส: ${code}`);
      setTimeout(async () => {
        await deleteFile(outputFile);
      }, 1000);
    });

    process.on("SIGINT", async () => {
      console.log("\nกำลังหยุดการทำงานของสคริปต์...");
      await deleteFile(outputFile);
      process.exit();
    });
  } else if (platform === "win32") {
    console.log(`เปิดไฟล์ ${outputFile} ด้วย Notepad`);
    console.log("เนื้อหาถูกคัดลอกแล้ว คุณสามารถกด Ctrl + V เพื่อวางได้");

    const command: string = `notepad.exe "${outputFile}"`;
    const notepadProcess = exec(command, (err: Error | null) => {
      if (err) {
        console.error(`เกิดข้อผิดพลาดในการเปิดไฟล์: ${err}`);
        return;
      }
    });

    notepadProcess.on("exit", async () => {
      await deleteFile(outputFile);
    });

    process.on("SIGINT", async () => {
      console.log("\nกำลังหยุดการทำงานของสคริปต์...");
      await deleteFile(outputFile);
      process.exit();
    });
  } else {
    console.log("ระบบปฏิบัติการที่ไม่รองรับ");
  }
}

async function deleteFile(file: string): Promise<void> {
  try {
    if (fs.existsSync(file)) {
      await unlinkAsync(file);
      console.log(`ไฟล์ ${file} ได้ถูกลบแล้ว`);
    } else {
      console.log(`ไฟล์ ${file} ไม่พบหรือถูกลบไปแล้ว`);
    }
  } catch (error) {
    console.error(`ไม่สามารถลบไฟล์ ${file}: ${error}`);
  }
}

async function main() {
  let originalPaths: string[] = ["/Users/wrpx/Desktop/angular-crud-app"];

  try {
    let outputFiles: (string | null)[] = await Promise.all(
      originalPaths.map(processDirectory)
    );
    for (const outputFile of outputFiles) {
      if (outputFile) {
        handleOutputFile(outputFile);
      }
    }
  } catch (error) {
    console.error(`เกิดข้อผิดพลาดในกระบวนการหลัก: ${error}`);
  }

  process.on("exit", () => {
    console.log("สคริปต์จบการทำงาน กำลังคืนทรัพยากรทั้งหมด...");
  });
}

main();
