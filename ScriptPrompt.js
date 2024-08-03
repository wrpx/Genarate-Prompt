/**
 * Code Collector Script
 * ====================
 *
 * วิธีใช้งาน:
 * 1. ติดตั้ง Node.js บนเครื่องของคุณ
 * 2. เปิด Command Prompt หรือ Terminal ในโฟลเดอร์ที่มีไฟล์สคริปต์นี้
 * 3. รันคำสั่ง: npm install
 * 4. แก้ไขตัวแปร 'originalPaths' ให้ชี้ไปยังโฟลเดอร์ที่คุณต้องการรวบรวมโค้ด เช่น let originalPaths = ["C:/Users/USER/Desktop/ExpressJs-CRUD"];
 * 5. รันสคริปต์ด้วยคำสั่ง: node start
 *
 * คำอธิบาย:
 * - สคริปต์นี้จะรวบรวมเนื้อหาของไฟล์โค้ดทั้งหมดในโฟลเดอร์ที่กำหนด
 * - สร้างโครงสร้างไฟล์ (file tree) ของโปรเจค
 * - รวมทั้งหมดเป็นไฟล์เดียวและเปิดในโปรแกรม Notepad
 * - หลังจากปิด Notepad ไฟล์ผลลัพธ์จะถูกลบโดยอัตโนมัติ
 *
 * การปรับแต่ง:
 * - แก้ไข 'allowedExtensions' เพื่อเพิ่มหรือลบนามสกุลไฟล์ที่ต้องการรวบรวม
 * - แก้ไข 'excludedFolders' เพื่อเพิ่มหรือลบโฟลเดอร์ที่ต้องการข้าม
 *
 * หมายเหตุ:
 * - สคริปต์นี้ทำงานบน Windows เท่านั้น เนื่องจากใช้ Notepad
 * - สำหรับระบบปฏิบัติการอื่น ให้แก้ไขฟังก์ชัน openNotepadAndDeleteAfterClose
 */

const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const allowedExtensions = [
  ".js",
  ".ts",
  ".java",
  ".py",
  ".html",
  ".css",
  ".jsx",
  ".tsx",
];

const excludedFolders = ["node_modules", ".git", "build", "dist"];

function readFilesFromDirectory(directoryPath) {
  let fileContents = [];

  fs.readdirSync(directoryPath, { withFileTypes: true }).forEach((dirent) => {
    const filePath = path.join(directoryPath, dirent.name);

    if (dirent.isDirectory() && !excludedFolders.includes(dirent.name)) {
      fileContents = fileContents.concat(readFilesFromDirectory(filePath));
    } else if (allowedExtensions.includes(path.extname(dirent.name))) {
      let content = fs.readFileSync(filePath, "utf8");
      let relativeFilePath = path.relative(process.cwd(), filePath);
      content = `//${relativeFilePath}\n${content}`;
      fileContents.push(content);
    }
  });

  return fileContents;
}

function generateFileTree(directoryPath, prefix = "") {
  let tree = "";
  const files = fs.readdirSync(directoryPath, { withFileTypes: true });

  files.forEach((file, index) => {
    if (excludedFolders.includes(file.name)) return;

    const isLast = index === files.length - 1;
    const newPrefix = prefix + (isLast ? "    " : "|   ");
    const filePath = path.join(directoryPath, file.name);

    if (
      file.isDirectory() ||
      allowedExtensions.includes(path.extname(file.name))
    ) {
      tree += prefix + (isLast ? "└── " : "├── ") + file.name + "\n";

      if (file.isDirectory()) {
        tree += generateFileTree(filePath, newPrefix);
      }
    }
  });

  return tree;
}

function createPrompt(contents, fileTree) {
  return contents.join("\n\n\n") + "\n\n// File Tree:\n" + fileTree;
}

function processDirectory(originalPath) {
  const directoryPath = originalPath.replace(/\\\\/g, "/");
  const fileTree = generateFileTree(directoryPath);
  const fileContents = readFilesFromDirectory(directoryPath);
  const prompt = createPrompt(fileContents, fileTree);
  const outputFile = path.join(
    __dirname,
    "Output_" + path.basename(directoryPath) + ".txt"
  );

  fs.writeFileSync(outputFile, prompt);
  return outputFile;
}

function openNotepadAndDeleteAfterClose(paths) {
  paths.forEach((outputFile) => {
    const process = exec(`notepad.exe ${outputFile}`, (err) => {
      if (err) {
        console.error(`เกิดข้อผิดพลาดในการเปิดไฟล์: ${err}`);
        return;
      }
    });

    process.on("close", () => {
      fs.unlinkSync(outputFile);
      console.log(`ไฟล์ ${outputFile} ได้ถูกลบแล้ว`);
    });
  });
}

let originalPaths = [
  // "C:/Users/USER/Desktop/ExpressJs-CRUD",
  "C:/Users/USER/Desktop/Java-Spring-Backend",
];

let outputFiles = originalPaths.map(processDirectory);
openNotepadAndDeleteAfterClose(outputFiles);
