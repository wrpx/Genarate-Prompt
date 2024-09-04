/**
 * Code Collector Script
 * ====================
 *
 * วิธีใช้งาน:
 * 1. ติดตั้ง Node.js และ TypeScript บนเครื่องของคุณ
 * 2. เปิด Terminal หรือ Command Prompt ในโฟลเดอร์ที่มีไฟล์สคริปต์นี้
 * 3. แก้ไขตัวแปร 'originalPaths' ให้ชี้ไปยังโฟลเดอร์ที่คุณต้องการรวบรวมโค้ด
 * 4. คอมไพล์สคริปต์ด้วยคำสั่ง: tsc ScriptPrompt.ts
 * 5. รันสคริปต์ด้วยคำสั่ง: node ScriptPrompt.js 
 *
 * คำอธิบาย:
 * - สคริปต์นี้จะรวบรวมเนื้อหาของไฟล์โค้ดทั้งหมดในโฟลเดอร์ที่กำหนด
 * - สร้างโครงสร้างไฟล์ (file tree) ของโปรเจค
 * - รวมทั้งหมดเป็นไฟล์เดียวและเปิดในโปรแกรม TextEdit (macOS) หรือ Notepad (Windows)
 * - หลังจากปิดโปรแกรมแก้ไขข้อความ ไฟล์ผลลัพธ์จะถูกลบโดยอัตโนมัติ
 */

import * as fs from "fs";
import * as path from "path";
import { exec, spawn } from "child_process";
import * as os from "os";

const allowedExtensions: string[] = [
  ".js",
  ".ts",
  ".java",
  ".py",
  ".jsx",
  ".tsx",
  ".go",
];

const excludedFolders: string[] = [
  "node_modules",
  ".git",
  "build",
  "dist",
  ".config",
];
const excludedFiles: string[] = ["postcss.config.js"];

function readFilesFromDirectory(directoryPath: string): string[] {
  let fileContents: string[] = [];

  fs.readdirSync(directoryPath, { withFileTypes: true }).forEach((dirent) => {
    const filePath: string = path.join(directoryPath, dirent.name);

    if (dirent.isDirectory() && !excludedFolders.includes(dirent.name)) {
      fileContents = fileContents.concat(readFilesFromDirectory(filePath));
    } else if (
      allowedExtensions.includes(path.extname(dirent.name)) &&
      !excludedFiles.includes(dirent.name)
    ) {
      let content: string = fs.readFileSync(filePath, "utf8");
      let relativeFilePath: string = path.relative(process.cwd(), filePath);
      content = `//${relativeFilePath}\n${content}`;
      fileContents.push(content);
    }
  });

  return fileContents;
}

function generateFileTree(directoryPath: string, prefix: string = ""): string {
  let tree: string = "";
  const files: fs.Dirent[] = fs.readdirSync(directoryPath, {
    withFileTypes: true,
  });

  files.forEach((file, index) => {
    if (
      excludedFolders.includes(file.name) ||
      excludedFiles.includes(file.name)
    )
      return;

    const isLast: boolean = index === files.length - 1;
    const newPrefix: string = prefix + (isLast ? "    " : "|   ");
    const filePath: string = path.join(directoryPath, file.name);

    if (
      file.isDirectory() ||
      (allowedExtensions.includes(path.extname(file.name)) &&
        !excludedFiles.includes(file.name))
    ) {
      tree += prefix + (isLast ? "└── " : "├── ") + file.name + "\n";

      if (file.isDirectory()) {
        tree += generateFileTree(filePath, newPrefix);
      }
    }
  });

  return tree;
}

function createPrompt(contents: string[], fileTree: string): string {
  return contents.join("\n\n\n") + "\n\n// File Tree:\n" + fileTree;
}

function processDirectory(originalPath: string): string {
  const directoryPath: string = originalPath.replace(/\\\\/g, "/");
  const fileTree: string = generateFileTree(directoryPath);
  const fileContents: string[] = readFilesFromDirectory(directoryPath);
  const prompt: string = createPrompt(fileContents, fileTree);
  const outputFile: string = path.join(
    __dirname,
    "Output_" + path.basename(directoryPath) + ".txt"
  );

  fs.writeFileSync(outputFile, prompt);
  return outputFile;
}

function handleOutputFile(outputFile: string): void {
  const platform: string = os.platform();

  if (platform === "darwin") {
    console.log(`เปิดไฟล์ ${outputFile} ด้วย TextEdit`);

    const openProcess = spawn("open", ["-a", "TextEdit", outputFile]);

    openProcess.on("close", (code: number) => {
      console.log(`TextEdit ถูกปิดด้วยรหัส: ${code}`);
      setTimeout(() => {
        deleteFile(outputFile);
      }, 1000);
    });

    process.on("SIGINT", () => {
      console.log("\nกำลังหยุดการทำงานของสคริปต์...");
      deleteFile(outputFile);
      process.exit();
    });
  } else if (platform === "win32") {
    const command: string = `notepad.exe "${outputFile}"`;
    const notepadProcess = exec(command, (err: Error | null) => {
      if (err) {
        console.error(`เกิดข้อผิดพลาดในการเปิดไฟล์: ${err}`);
        return;
      }
    });

    notepadProcess.on("exit", () => deleteFile(outputFile));
  } else {
    console.log("ระบบปฏิบัติการที่ไม่รองรับ");
  }
}

function deleteFile(file: string): void {
  try {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      console.log(`ไฟล์ ${file} ได้ถูกลบแล้ว`);
    } else {
      console.log(`ไฟล์ ${file} ไม่พบหรือถูกลบไปแล้ว`);
    }
  } catch (error) {
    console.error(`ไม่สามารถลบไฟล์ ${file}: ${error}`);
  }
}

let originalPaths: string[] = [
  // เพิ่มพาธของโฟลเดอร์ที่ต้องการรวบรวมโค้ดที่นี่
  // ตัวอย่าง: "/Users/username/Projects/MyProject",
  "/Users/wrpx/Desktop/ExpressJs-CRUD",
];

let outputFiles: string[] = originalPaths.map(processDirectory);
outputFiles.forEach(handleOutputFile);

process.on("exit", () => {
  console.log("สคริปต์จบการทำงาน กำลังคืนทรัพยากรทั้งหมด...");
});
