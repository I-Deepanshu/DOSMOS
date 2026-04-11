import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const uploadMedia = async (fileBuffer, mimetype, filename) => {
  const isCloudinaryEnabled = !!process.env.CLOUDINARY_URL;

  // Explicitly configure Cloudinary if the URL exists
  if (isCloudinaryEnabled) {
    const url = process.env.CLOUDINARY_URL;
    if (url && url.startsWith("cloudinary://")) {
      const parts = url.replace("cloudinary://", "").split("@");
      const creds = parts[0].split(":");
      cloudinary.config({
        api_key: creds[0],
        api_secret: creds[1],
        cloud_name: parts[1]
      });
    }
  }

  // Cloudinary Implementation
  if (isCloudinaryEnabled) {
    return new Promise((resolve, reject) => {
      // resource_type: "auto" intelligently detects if it's an image or video (audio is treated as video/audio in Cloudinary)
      const uploadStream = cloudinary.uploader.upload_stream(
        { resource_type: "auto", folder: "dosmos" },
        (error, result) => {
          if (error) {
            console.error("[media] Cloudinary upload error", error);
            return reject(error);
          }
          resolve({
            url: result.secure_url,
            type: mimetype.startsWith("image/") ? "image" : "audio",
            size: result.bytes,
            duration: result.duration || 0,
          });
        }
      );
      
      // End the stream with our bufffer
      uploadStream.end(fileBuffer);
    });
  }

  // Local Disk Fallback Implementation
  console.log("[media] CLOUDINARY_URL missing. Using local fallback.");
  const ext = mimetype.split('/')[1]?.split(';')[0] || (mimetype.startsWith("image/") ? "png" : "webm");
  const uniqueName = `${uuidv4()}.${ext}`;
  const uploadDir = path.join(__dirname, "../../public/uploads");
  const filePath = path.join(uploadDir, uniqueName);

  // Ensure dir exists in case New-Item missed it
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  fs.writeFileSync(filePath, fileBuffer);
  
  const size = Buffer.byteLength(fileBuffer);
  // Using localhost:4000 for local fallback dev mode
  const localUrl = `http://localhost:${process.env.PORT || 4000}/uploads/${uniqueName}`;

  return {
    url: localUrl,
    type: mimetype.startsWith("image/") ? "image" : "audio",
    size,
    duration: 0, // Fallback duration could be extracted on frontend
  };
};
