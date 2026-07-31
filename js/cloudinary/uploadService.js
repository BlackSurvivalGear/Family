/**
 * Cloudinary Upload Service
 * Handles direct browser-to-Cloudinary uploading via Fetch API.
 * Supports progress tracking, simulation fallback, and offline sync queues.
 */

import { getCloudinaryConfig } from "../../config.cloudinary.js";
import { DatabaseFailure, ValidationError } from "../services/errors.js";

// In-memory array to store physical File uploads for offline sync during session
const activeFileQueue = [];

// LocalStorage key for persistent sync registry (storing metadata for items awaiting sync)
const OFFLINE_SYNC_KEY = "lawal_cloudinary_offline_queue";

function getStoredOfflineQueue() {
  try {
    const data = localStorage.getItem(OFFLINE_SYNC_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to read offline queue:", e);
    return [];
  }
}

function saveStoredOfflineQueue(queue) {
  try {
    localStorage.setItem(OFFLINE_SYNC_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error("Failed to save offline queue:", e);
  }
}

/**
 * Uploads a file to Cloudinary. Falls back to simulated upload if in simulation mode or offline.
 *
 * @param {File} file - Browser File object.
 * @param {string} category - Destination subfolder (e.g., 'profiles', 'gallery', 'documents').
 * @param {object} options - Upload customization options.
 * @param {function} [options.onProgress] - Callback function for progress tracking `(percentDone)`.
 * @returns {Promise<object>} Standardized Cloudinary upload result.
 */
export async function uploadFile(file, category = "gallery", options = {}) {
  if (!file) {
    throw new ValidationError("No file provided for upload.");
  }

  const config = getCloudinaryConfig();
  const isOffline = !navigator.onLine;

  // If we are currently offline, trigger offline queuing
  if (isOffline) {
    console.warn("[Upload Service] Network offline. Enqueuing asset for background sync.");
    enqueueOfflineUpload(file, category, options);
    return await simulateUpload(file, category, options);
  }

  // If Cloudinary config is in simulation mode, return simulated result
  if (config.isSimulation) {
    return await simulateUpload(file, category, options);
  }

  // Live Cloudinary Upload Flow
  const cloudName = config.cloudName;
  const uploadPreset = config.uploadPreset;
  const folderPath = `${config.folder}/${category}`.replace(/\/+/g, "/");

  // Prepare form data
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);
  formData.append("folder", folderPath);

  // Determine resource type by mime type
  let resourceType = "auto";
  if (file.type.startsWith("image/")) resourceType = "image";
  else if (file.type.startsWith("video/")) resourceType = "video";
  else if (file.type.startsWith("audio/")) resourceType = "raw"; // or auto

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

  try {
    const result = await uploadWithXHR(url, formData, options.onProgress);
    return {
      publicId: result.public_id,
      secureUrl: result.secure_url,
      thumbnailUrl: result.secure_url, // will be optimized by transformation utility
      width: result.width || null,
      height: result.height || null,
      bytes: result.bytes || file.size,
      format: result.format || file.name.split(".").pop().toLowerCase(),
      resourceType: result.resource_type || "image",
      createdAt: new Date().toISOString()
    };
  } catch (error) {
    console.error("[Upload Service] Live upload failed. Attempting simulation/offline fallback.", error);
    enqueueOfflineUpload(file, category, options);
    throw new DatabaseFailure(`Upload failed: ${error.message || error}`);
  }
}

/**
 * Executes file upload via XHR to support progress tracking.
 */
function uploadWithXHR(url, formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);

    if (onProgress) {
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
        }
      });
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch (e) {
          reject(new Error("Failed to parse Cloudinary response."));
        }
      } else {
        reject(new Error(`Cloudinary responded with status ${xhr.status}: ${xhr.statusText}`));
      }
    };

    xhr.onerror = () => reject(new Error("Network interruption or CORS error."));
    xhr.ontimeout = () => reject(new Error("Upload timed out."));

    // 60 seconds timeout
    xhr.timeout = 60000;

    xhr.send(formData);
  });
}

/**
 * Simulates the file upload process for offline testability and simulation mode.
 */
export async function simulateUpload(file, category, options = {}) {
  return new Promise((resolve) => {
    let progress = 0;
    const intervalTime = file.size > 5 * 1024 * 1024 ? 200 : 50; // slow down for bigger files

    const timer = setInterval(() => {
      progress += 10;
      if (options.onProgress) {
        options.onProgress(Math.min(progress, 100));
      }
      if (progress >= 100) {
        clearInterval(timer);

        const ext = file.name.split(".").pop().toLowerCase();
        const randId = `sim-pub-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const simulatedPublicId = `${category}/${randId}`;

        // Default beautiful stock placeholders based on category
        let simulatedUrl = "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80"; // standard gallery
        if (category === "profiles") {
          simulatedUrl = file.type.includes("female") || file.name.includes("female")
            ? "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80"
            : "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80";
        } else if (category === "documents" || category === "certificates" || category === "military") {
          simulatedUrl = "https://images.unsplash.com/photo-1568667256549-094345857637?auto=format&fit=crop&w=800&q=80"; // legal paper style
        } else if (category === "videos") {
          simulatedUrl = "https://assets.mixkit.co/videos/preview/mixkit-african-family-having-lunch-together-41584-large.mp4";
        } else if (category === "audio") {
          simulatedUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";
        }

        resolve({
          publicId: simulatedPublicId,
          secureUrl: simulatedUrl,
          thumbnailUrl: simulatedUrl,
          width: 800,
          height: 600,
          bytes: file.size,
          format: ext,
          resourceType: file.type.split("/")[0] || "image",
          createdAt: new Date().toISOString(),
          isSimulated: true
        });
      }
    }, intervalTime);
  });
}

/**
 * Enqueues an upload into the offline retry queue.
 */
function enqueueOfflineUpload(file, category, options) {
  const queueId = `offline-q-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  // Store the File object in memory
  activeFileQueue.push({
    queueId,
    file,
    category,
    options
  });

  // Store metadata persistently in localStorage
  const registry = getStoredOfflineQueue();
  registry.push({
    queueId,
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    category,
    timestamp: new Date().toISOString()
  });
  saveStoredOfflineQueue(registry);
  console.log(`[Upload Service] Asset [${file.name}] queued successfully. Queue ID: ${queueId}`);
}

/**
 * Triggers background synchronization of pending offline uploads.
 * Automatically runs when internet connection is detected.
 */
export async function processOfflineQueue() {
  const registry = getStoredOfflineQueue();
  if (registry.length === 0 || !navigator.onLine) return;

  console.log(`[Upload Service] Background connection detected. Syncing ${registry.length} queued upload(s)...`);

  for (let i = 0; i < registry.length; i++) {
    const item = registry[i];
    // Find the file in memory
    const fileIndex = activeFileQueue.findIndex(f => f.queueId === item.queueId);
    if (fileIndex > -1) {
      const activeObj = activeFileQueue[fileIndex];
      try {
        console.log(`[Upload Service] Syncing queued file [${item.fileName}]...`);
        // Upload to Cloudinary (use a configuration check, bypass live check if simulation still forced)
        const result = await uploadFile(activeObj.file, activeObj.category, activeObj.options);

        // Remove from memory queue and persistent queue
        activeFileQueue.splice(fileIndex, 1);
        registry.splice(i, 1);
        i--; // shift index
        saveStoredOfflineQueue(registry);

        console.log(`[Upload Service] Queued file [${item.fileName}] successfully uploaded to Cloudinary!`, result);

        // Trigger a custom event in the browser
        const syncEvent = new CustomEvent("cloudinary_sync_completed", { detail: { item, result } });
        window.dispatchEvent(syncEvent);

      } catch (err) {
        console.error(`[Upload Service] Failed to sync queued item [${item.fileName}]. Will retry later.`, err);
      }
    } else {
      // Physical file handle is lost across browser reloads, clean up or convert to simulated item
      console.warn(`[Upload Service] File handle for queued item [${item.fileName}] is no longer in memory. Converting to simulated upload.`);
      registry.splice(i, 1);
      i--;
      saveStoredOfflineQueue(registry);
    }
  }
}

// Automatically listen for browser online status
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    processOfflineQueue().catch(err => console.error("[Upload Service] Error during online auto-sync:", err));
  });
}
