/**
 * Cloudinary Configuration Module
 * Loads settings dynamically to avoid hardcoding credentials.
 * Supports a simulated fallback mode for offline/simulated execution with high fidelity.
 */

export const getCloudinaryConfig = () => {
  // Try to load from localStorage (allows dynamic custom configurations set via settings UI or tests)
  const cloudName = localStorage.getItem("cloudinary_cloud_name") || window.CLOUDINARY_CLOUD_NAME || "";
  const uploadPreset = localStorage.getItem("cloudinary_upload_preset") || window.CLOUDINARY_UPLOAD_PRESET || "";
  const folder = localStorage.getItem("cloudinary_folder") || window.CLOUDINARY_FOLDER || "house-of-lawal";
  const secure = localStorage.getItem("cloudinary_secure") !== "false"; // defaults to true

  // Simulation mode is active if live credentials are not present OR if forced via localStorage/config
  const forceSimulation = localStorage.getItem("cloudinary_force_simulation") === "true" || localStorage.getItem("firebase_force_simulation") === "true";
  const isSimulation = forceSimulation || !cloudName || !uploadPreset;

  return {
    cloudName,
    uploadPreset,
    folder,
    secure,
    isSimulation
  };
};

export const CLOUDINARY_CONFIG = getCloudinaryConfig();
