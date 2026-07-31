/**
 * Cloudinary Document Archiving Service
 * Governs archival document uploads (birth certificates, deeds, military records)
 * and formats metadata to map cleanly to Firestore schemas.
 */

import { validateFile } from "./mediaValidator.js";
import { uploadFile } from "./uploadService.js";
import { getTransformationUrl } from "./cloudinary.js";
import { getCurrentUser } from "../firebase/auth.js";

/**
 * Validates and uploads a document file.
 * Automatically organizes uploads into distinct subfolders based on category.
 *
 * @param {File} file - Selected document file.
 * @param {object} meta - Document fields { memberId, title, category }
 * @returns {Promise<object>} Clean, structured document metadata.
 */
export async function uploadDocument(file, meta = {}) {
  const category = meta.category || "documents";

  // 1. Validate file
  validateFile(file, category);

  // 2. Perform upload with progress
  const uploadResult = await uploadFile(file, category);

  // 3. Generate standard file size string (e.g., "1.4 MB")
  const bytes = uploadResult.bytes || file.size;
  let fileSizeStr = `${bytes} B`;
  if (bytes > 1024 * 1024) {
    fileSizeStr = `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  } else if (bytes > 1024) {
    fileSizeStr = `${(bytes / 1024).toFixed(2)} KB`;
  }

  // 4. Generate thumbnail. If it is an image, we can crop/resize it.
  // If it's a PDF, Cloudinary supports pdf page rendering like `[publicId].jpg` if we pass page 1, or we can use a standard PDF icon.
  let thumbnailUrl = "";
  const ext = uploadResult.format || file.name.split(".").pop().toLowerCase();

  if (["jpg", "jpeg", "png", "webp", "heic"].includes(ext)) {
    thumbnailUrl = getTransformationUrl(uploadResult.publicId, {
      size: "thumbnail",
      width: 300,
      height: 300,
      crop: "fill"
    });
  } else if (ext === "pdf") {
    // Cloudinary supports pdf thumbnail via page 1: publicId + .jpg
    thumbnailUrl = getTransformationUrl(uploadResult.publicId, {
      size: "thumbnail",
      width: 300,
      height: 300,
      crop: "fill",
      resourceType: "image"
    }) + ".jpg";
  } else {
    // Return standard file preview icon
    thumbnailUrl = "https://images.unsplash.com/photo-1568667256549-094345857637?auto=format&fit=crop&w=300&q=80";
  }

  const user = getCurrentUser();

  // 5. Build canonical Firestore document metadata structure
  return {
    memberId: meta.memberId || null,
    title: meta.title || file.name.split(".")[0],
    type: ext.toUpperCase(),
    category: category,
    cloudinaryPublicId: uploadResult.publicId,
    cloudinaryUrl: uploadResult.secureUrl,
    fileUrl: uploadResult.secureUrl, // satisfy legacy repository expectation
    thumbnailUrl: thumbnailUrl,
    uploadedBy: user ? user.uid : "system",
    uploadedAt: new Date().toISOString(),
    size: fileSizeStr, // satisfy legacy repository expectation
    fileSize: fileSizeStr,
    mimeType: file.type || `application/${ext}`,
    version: 1
  };
}
