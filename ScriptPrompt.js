const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

function readFilesFromDirectory(directoryPath) {
  let fileContents = [];

  fs.readdirSync(directoryPath, { withFileTypes: true }).forEach((dirent) => {
    const filePath = path.join(directoryPath, dirent.name);

    if (dirent.isDirectory()) {
      fileContents = fileContents.concat(readFilesFromDirectory(filePath));
    } else {
      let content = fs.readFileSync(filePath, "utf8");
      let fileNameWithoutExt = path.basename(
        dirent.name,
        path.extname(dirent.name)
      );
      content = `//${fileNameWithoutExt}${path.extname(
        dirent.name
      )}\n${content}`;
      fileContents.push(content);
    }
  });

  return fileContents;
}

function generateFileTree(directoryPath, prefix = "") {
  let tree = "";
  const files = fs.readdirSync(directoryPath, { withFileTypes: true });

  files.forEach((file, index) => {
    const isLast = index === files.length - 1;
    const newPrefix = prefix + (isLast ? "    " : "|   ");
    const filePath = path.join(directoryPath, file.name);
    tree += prefix + (isLast ? "└── " : "├── ") + file.name + "\n";

    if (file.isDirectory()) {
      tree += generateFileTree(filePath, newPrefix);
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
  "C:/Users/Wiraphat/Desktop/React+Java+PosgreSQL/Java-Spring-Backend/src/main/java/com/example/javaspringbackend",
  "C:/Users/Wiraphat/Desktop/React+Java+PosgreSQL/React-Frontend/src/route",
];

let outputFiles = originalPaths.map(processDirectory);
openNotepadAndDeleteAfterClose(outputFiles);
