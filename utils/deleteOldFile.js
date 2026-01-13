import fs from "fs";
import path from "path";

export const deleteOldFile = (folderPath, fileName) => {
  if (!fileName) return;

  const fullPath = path.join(folderPath, fileName);

  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
};
