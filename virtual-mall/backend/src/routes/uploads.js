import { Router } from "express";
import { Readable } from "node:stream";
import { cloudinary, cloudinaryConfigured } from "../config/cloudinary.js";
import { upload } from "../middleware/upload.js";

const router = Router();

router.post("/", upload.single("image"), async (req, res, next) => {
  try {
    if (!cloudinaryConfigured) {
      return res.status(503).json({ error: "Cloudinary is not configured. Add its credentials to backend/.env." });
    }
    if (!req.file) return res.status(400).json({ error: "Choose an image file." });

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "virtual-mall/products", resource_type: "image" },
        (error, uploaded) => error ? reject(error) : resolve(uploaded)
      );
      Readable.from(req.file.buffer).pipe(stream);
    });

    res.status(201).json({ url: result.secure_url, publicId: result.public_id });
  } catch (error) {
    next(error);
  }
});

export default router;
