import multer from "multer";

const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!allowed.has(file.mimetype)) {
      return callback(new Error("Only JPG, PNG, WEBP, and AVIF images are allowed."));
    }
    callback(null, true);
  }
});
