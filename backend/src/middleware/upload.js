import multer from "multer";
import path from "path";

// Use memory storage to allow processing and uploading to Cloudinary/S3 directly.
// If falling back to local storage, the service layer will write the buffer to disk.
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Support image and audio mime types
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('audio/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error("Unsupported file type. Only images and audio are allowed."), false);
  }
};

export const uploadMediaMiddleware = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB max file size to cover realistic audio/image bounds safely
  },
  fileFilter
});
