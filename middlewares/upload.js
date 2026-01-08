import multer from "multer";
import path from "path";
import fs from "fs";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath = "uploads/";

    switch (file.fieldname) {
      case "profile_image":
        uploadPath += "profile_images/";
        break;
      case "pan_image":
        uploadPath += "pan_images/";
        break;
      case "aadhar_front_image":
        uploadPath += "aadhar_images/front/";
        break;
      case "aadhar_back_image":
        uploadPath += "aadhar_images/back/";
        break;
      default:
        uploadPath += "others/";
    }

    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },

  filename: function (req, file, cb) {
    const uniqueName = `${Date.now()}_${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

export const uploadDocs = multer({
  storage,
  // limits: {
  //   fileSize: 2 * 1024 * 1024, // 2MB limit (recommended)
  // },
  fileFilter: (req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png"];
    const ext = path.extname(file.originalname).toLowerCase();

    if (!allowed.includes(ext)) {
      return cb(new Error("Only JPG, JPEG, PNG files are allowed"));
    }

    cb(null, true);
  },
});
