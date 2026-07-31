/**
 * Media Validator Module
 * Governs the correctness of uploaded assets across size limits and mime-type families.
 */

import { ValidationError } from "../services/errors.js";

export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;     // 10MB
export const MAX_DOCUMENT_SIZE = 25 * 1024 * 1024;  // 25MB
export const MAX_VIDEO_SIZE = 100 * 1024 * 1024;    // 100MB
export const MAX_AUDIO_SIZE = 50 * 1024 * 1024;     // 50MB

export const ALLOWED_EXTENSIONS = {
  images: ["jpg", "jpeg", "png", "webp", "heic", "tiff"],
  documents: ["pdf", "docx", "jpg", "png", "webp", "heic", "tiff"],
  videos: ["mp4", "webm", "ogg", "avi", "mov"],
  audio: ["mp3", "wav", "aac", "m4a"]
};

/**
 * Validates a file's eligibility for upload.
 *
 * @param {File|object} file - The file or metadata to validate.
 * @param {string} category - The destination folder/category (e.g. 'profiles', 'gallery', 'documents', 'military', 'certificates', 'obituaries', 'videos')
 * @returns {boolean} True if valid, throws ValidationError otherwise.
 */
export function validateFile(file, category) {
  if (!file) {
    throw new ValidationError("No file provided for validation.");
  }

  const name = file.name || "";
  const size = file.size || file.bytes || 0;
  const ext = name.split(".").pop().toLowerCase();

  if (!name) {
    throw new ValidationError("File name is missing or invalid.");
  }

  // 1. Determine resource type family
  let family = "documents"; // default
  if (category === "profiles" || category === "gallery" || category === "history" || category === "obituaries") {
    family = "images";
  } else if (category === "videos") {
    family = "videos";
  } else if (category === "audio") {
    family = "audio";
  }

  // Allow document uploads to be images or actual documents
  const isDocCategory = (category === "documents" || category === "military" || category === "certificates");

  // 2. Validate file extension
  let isAllowedExt = false;
  if (isDocCategory) {
    isAllowedExt = ALLOWED_EXTENSIONS.documents.includes(ext);
  } else {
    isAllowedExt = ALLOWED_EXTENSIONS[family] && ALLOWED_EXTENSIONS[family].includes(ext);
  }

  if (!isAllowedExt) {
    throw new ValidationError(`Unsupported file extension [.${ext}] for category [${category}].`);
  }

  // 3. Validate file size limits
  let maxSize = MAX_DOCUMENT_SIZE;
  if (family === "images" && !isDocCategory) {
    maxSize = MAX_IMAGE_SIZE;
  } else if (family === "videos") {
    maxSize = MAX_VIDEO_SIZE;
  } else if (family === "audio") {
    maxSize = MAX_AUDIO_SIZE;
  }

  if (size > maxSize) {
    const sizeMB = (size / (1024 * 1024)).toFixed(2);
    const maxMB = (maxSize / (1024 * 1024)).toFixed(0);
    throw new ValidationError(`File is too large (${sizeMB}MB). Maximum allowed for this category is ${maxMB}MB.`);
  }

  return true;
}
