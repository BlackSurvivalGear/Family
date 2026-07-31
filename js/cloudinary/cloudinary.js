/**
 * Cloudinary Delivery & Transformation Module
 * Generates highly-optimized responsive assets using Cloudinary transformations.
 * Supports on-the-fly thumbnail, medium, and large generations with f_auto/q_auto compression.
 */

import { CLOUDINARY_CONFIG } from "../../config.cloudinary.js";

/**
 * Builds a transformed Cloudinary URL.
 *
 * @param {string} publicId - The public ID of the asset.
 * @param {object} options - Transformation overrides.
 * @param {string} [options.resourceType='image'] - 'image', 'video', or 'raw'.
 * @param {string} [options.size='original'] - 'thumbnail', 'medium', 'large', or 'original'.
 * @param {string} [options.crop] - Custom crop parameters (e.g., 'fill', 'thumb', 'scale').
 * @param {number} [options.width] - Custom width.
 * @param {number} [options.height] - Custom height.
 * @returns {string} Fully formatted asset URL.
 */
export function getTransformationUrl(publicId, options = {}) {
  if (!publicId) return "";

  // If publicId looks like a full URL already (such as in local/offline simulation or legacy fallback)
  if (publicId.startsWith("http://") || publicId.startsWith("https://") || publicId.startsWith("data:")) {
    // For simulation, append transformation query params for high-fidelity offline representation
    if (options.size && options.size !== "original") {
      const separator = publicId.includes("?") ? "&" : "?";
      return `${publicId}${separator}size=${options.size}`;
    }
    return publicId;
  }

  const config = CLOUDINARY_CONFIG;
  const cloudName = config.cloudName || "house-of-lawal-mock";
  const resourceType = options.resourceType || "image";

  // Build the transformation string based on the preset or options
  let transforms = [];

  if (resourceType === "image") {
    // Always apply automatic compression and responsive format
    transforms.push("f_auto");
    transforms.push("q_auto");

    if (options.size === "thumbnail") {
      const w = options.width || 150;
      const h = options.height || 150;
      const crop = options.crop || "fill";
      transforms.push(`c_${crop}`);
      transforms.push(`w_${w}`);
      transforms.push(`h_${h}`);
      transforms.push("g_face"); // Smart-crop focusing on faces
    } else if (options.size === "medium") {
      transforms.push(`w_${options.width || 800}`);
    } else if (options.size === "large") {
      transforms.push(`w_${options.width || 1600}`);
    } else if (options.width || options.height) {
      if (options.crop) transforms.push(`c_${options.crop}`);
      if (options.width) transforms.push(`w_${options.width}`);
      if (options.height) transforms.push(`h_${options.height}`);
    }
  } else if (resourceType === "video") {
    transforms.push("q_auto");
    if (options.size === "thumbnail") {
      // Return a poster image thumbnail for the video
      return `https://res.cloudinary.com/${cloudName}/video/upload/c_limit,w_300/f_jpg/${publicId}.jpg`;
    }
  }

  const transformSegment = transforms.length > 0 ? transforms.join(",") + "/" : "";
  const scheme = config.secure !== false ? "https" : "http";

  return `${scheme}://res.cloudinary.com/${cloudName}/${resourceType}/upload/${transformSegment}${publicId}`;
}

/**
 * Returns optimized versions (thumbnail, medium, large, original) for a public ID.
 *
 * @param {string} publicId - Cloudinary Public ID.
 * @param {string} [resourceType='image'] - Asset type.
 * @returns {object} Map of size URLs.
 */
export function getOptimizedUrls(publicId, resourceType = "image") {
  return {
    thumbnail: getTransformationUrl(publicId, { size: "thumbnail", resourceType }),
    medium: getTransformationUrl(publicId, { size: "medium", resourceType }),
    large: getTransformationUrl(publicId, { size: "large", resourceType }),
    original: getTransformationUrl(publicId, { size: "original", resourceType })
  };
}
