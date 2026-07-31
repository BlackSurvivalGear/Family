/**
 * Cloudinary Image & Gallery Service
 * Provides specialized APIs for Profile picture lifecycle operations,
 * thumbnail generations, and family gallery bulk operations.
 */

import { validateFile } from "./mediaValidator.js";
import { uploadFile } from "./uploadService.js";
import { getTransformationUrl } from "./cloudinary.js";

/**
 * Validates, compresses, and uploads a profile photo.
 * Applies a default crop & resize transformation via URL generator.
 *
 * @param {File} file - Profile picture file.
 * @param {string} memberId - Target family member ID.
 * @returns {Promise<object>} Uploaded asset details.
 */
export async function uploadProfilePicture(file, memberId) {
  validateFile(file, "profiles");

  // Perform upload
  const uploadResult = await uploadFile(file, "profiles");

  // Profile-specific URL transformations
  const profileUrl = getTransformationUrl(uploadResult.publicId, {
    size: "thumbnail",
    width: 300,
    height: 300,
    crop: "fill"
  });

  return {
    ...uploadResult,
    memberId,
    profileUrl,
    secureUrl: profileUrl
  };
}

/**
 * Handles bulk uploading of gallery images.
 * Supports progress tracking, captions, tags, albums, and sort order.
 *
 * @param {FileList|File[]} files - Selected files.
 * @param {object} meta - Core metadata for the bulk files { memberId, caption, description, tags, album, sortOrder }
 * @param {function} [onProgress] - Bulk progress callback `(progressPercent)`.
 * @returns {Promise<object[]>} Array of uploaded media records.
 */
export async function uploadGalleryImages(files, meta = {}, onProgress) {
  const fileArray = Array.from(files);
  const totalFiles = fileArray.length;
  if (totalFiles === 0) return [];

  const results = [];
  let completedCount = 0;

  for (let i = 0; i < totalFiles; i++) {
    const file = fileArray[i];
    try {
      // Validate gallery image
      validateFile(file, "gallery");

      // Custom progress reporter that aggregates bulk progress
      const progressReporter = (percentDone) => {
        if (onProgress) {
          const totalProgress = Math.round(((completedCount + (percentDone / 100)) / totalFiles) * 100);
          onProgress(totalProgress);
        }
      };

      const uploadResult = await uploadFile(file, "gallery", { onProgress: progressReporter });

      // Build specific thumbnails and delivery URLs
      const thumbnailUrl = getTransformationUrl(uploadResult.publicId, {
        size: "thumbnail",
        width: 300,
        height: 200,
        crop: "fill"
      });

      results.push({
        ...uploadResult,
        thumbnailUrl,
        memberId: meta.memberId || null,
        caption: meta.caption || file.name.split(".")[0],
        description: meta.description || "",
        tags: meta.tags || [],
        album: meta.album || "General Gallery",
        sortOrder: meta.sortOrder !== undefined ? meta.sortOrder : i
      });

      completedCount++;
      if (onProgress) {
        onProgress(Math.round((completedCount / totalFiles) * 100));
      }
    } catch (error) {
      console.error(`[Image Service] Bulk upload failed for file: ${file.name}`, error);
      throw error;
    }
  }

  return results;
}
