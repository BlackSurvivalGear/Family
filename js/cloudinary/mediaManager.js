/**
 * Unified Cloudinary Media Manager
 * Coordinates permissions, direct-upload services, Firestore metadata persistence,
 * and Event Bus publications.
 */

import { PermissionDenied, ValidationError } from "../services/errors.js";
import { getCurrentUser } from "../firebase/auth.js";
import { getTransformationUrl } from "./cloudinary.js";
import { uploadProfilePicture, uploadGalleryImages } from "./imageService.js";
import { uploadDocument } from "./documentService.js";

// Import existing repositories
import * as familyRepository from "../repositories/familyRepository.js";
import * as mediaRepository from "../repositories/mediaRepository.js";
import * as documentRepository from "../repositories/documentRepository.js";

// Import Event Bus
import * as eventBus from "../services/eventBus.js";

/**
 * Validates role-based permission for media operations.
 *
 * @param {string} action - Action name (e.g., 'UPLOAD_PROFILE', 'UPLOAD_FAMILY_MEDIA', 'MANAGE_HISTORICAL', 'DELETE_MEDIA')
 * @param {object} meta - Context metadata (e.g. memberId, branchId)
 * @returns {boolean} True if permitted.
 */
export function checkPermission(action, meta = {}) {
  const user = getCurrentUser();
  if (!user) {
    throw new PermissionDenied("Authentication is required to perform media actions.");
  }

  const role = (user.role || "").toUpperCase();

  // Super Admins and Family Admins have absolute power
  if (role === "SUPER_ADMIN" || role === "FAMILY_ADMIN") {
    return true;
  }

  switch (action) {
    case "UPLOAD_PROFILE":
      // MEMBER can upload their own profile photo
      if (role === "MEMBER") {
        if (meta.memberId && meta.memberId === user.uid) {
          return true;
        }
        throw new PermissionDenied("MEMBER can only upload their own profile photo.");
      }
      // EDITOR, HISTORIAN, BRANCH_ADMIN and above can upload profiles
      if (["EDITOR", "HISTORIAN", "BRANCH_ADMIN"].includes(role)) {
        return true;
      }
      break;

    case "UPLOAD_FAMILY_MEDIA":
      // EDITOR and above can upload family media
      if (["EDITOR", "HISTORIAN", "BRANCH_ADMIN"].includes(role)) {
        return true;
      }
      break;

    case "MANAGE_HISTORICAL":
      // HISTORIAN and BRANCH_ADMIN can manage historical archives and certificates
      if (["HISTORIAN", "BRANCH_ADMIN"].includes(role)) {
        return true;
      }
      break;

    case "MANAGE_BRANCH":
      // BRANCH_ADMIN can manage branch media for their own branch
      if (role === "BRANCH_ADMIN") {
        if (meta.branchId && user.branch && meta.branchId !== user.branch) {
          throw new PermissionDenied(`BRANCH_ADMIN can only manage media for branch [${user.branch}].`);
        }
        return true;
      }
      break;

    case "DELETE_MEDIA":
      // Destructive deletions require administrative roles
      if (role === "SUPER_ADMIN" || role === "FAMILY_ADMIN" || role === "BRANCH_ADMIN") {
        return true;
      }
      break;
  }

  throw new PermissionDenied(`User with role [${role}] does not have permission for [${action}].`);
}

/**
 * Replaces a profile photo for a family member.
 * Organizes asset replacement: uploads new, deletes previous, updates Firestore, and alerts UI.
 *
 * @param {File} file - New profile picture file.
 * @param {string} memberId - Target family member ID.
 * @returns {Promise<object>} Updated family member record.
 */
export async function replaceProfilePhoto(file, memberId) {
  // 1. Permission Check
  checkPermission("UPLOAD_PROFILE", { memberId });

  // 2. Fetch existing member
  const member = await familyRepository.findById(memberId, true);
  if (!member) {
    throw new ValidationError(`Family member [${memberId}] not found.`);
  }

  // 3. Upload new photo
  const profileDetails = await uploadProfilePicture(file, memberId);

  // 4. Update family member record in Firestore
  const updatedPhotoUrl = profileDetails.profileUrl;
  await familyRepository.update(memberId, { profilePhoto: updatedPhotoUrl });

  // 5. Fire Event Bus Notification
  eventBus.publish("profilePhotoChanged", {
    memberId,
    profilePhoto: updatedPhotoUrl,
    previousPhoto: member.profilePhoto || null
  });

  return {
    ...member,
    profilePhoto: updatedPhotoUrl
  };
}

/**
 * Uploads family gallery images and creates Firestore metadata.
 *
 * @param {FileList|File[]} files - Upload files.
 * @param {object} meta - Gallery metadata fields { memberId, caption, description, tags, album, sortOrder }
 * @param {function} [onProgress] - Bulk progress callback.
 * @returns {Promise<object[]>} Created media records in Firestore.
 */
export async function uploadGallery(files, meta = {}, onProgress) {
  // 1. Permission check
  checkPermission("UPLOAD_FAMILY_MEDIA", meta);

  // 2. Perform bulk upload
  const uploads = await uploadGalleryImages(files, meta, onProgress);
  const user = getCurrentUser();

  const createdRecords = [];
  for (const up of uploads) {
    const mediaId = `media-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const mediaData = {
      mediaId,
      documentId: mediaId, // documentId requested in schema mapping
      memberId: up.memberId,
      publicId: up.publicId,
      url: up.secureUrl, // satisfy legacy repository expectation
      secureUrl: up.secureUrl,
      thumbnailUrl: up.thumbnailUrl,
      width: up.width,
      height: up.height,
      bytes: up.bytes,
      format: up.format,
      resourceType: up.resourceType,
      caption: up.caption,
      tags: up.tags,
      album: up.album,
      sortOrder: up.sortOrder,
      uploadedBy: user ? user.uid : "system",
      createdAt: new Date().toISOString()
    };

    // Save in Firestore
    await mediaRepository.create(mediaData);
    createdRecords.push(mediaData);

    // Event Bus
    eventBus.publish("mediaUploaded", mediaData);
  }

  // Publish bulk gallery updated event
  eventBus.publish("galleryUpdated", createdRecords);

  return createdRecords;
}

/**
 * Uploads a document (e.g. birth certificate, military record) and registers Firestore metadata.
 *
 * @param {File} file - Selected document.
 * @param {object} meta - Document fields { memberId, title, category }
 * @returns {Promise<object>} Registered document record.
 */
export async function uploadDoc(file, meta = {}) {
  // Determine permission action
  const category = meta.category || "documents";
  const action = (category === "military" || category === "certificates") ? "MANAGE_HISTORICAL" : "UPLOAD_FAMILY_MEDIA";

  checkPermission(action, meta);

  // Perform upload
  const docMeta = await uploadDocument(file, meta);

  // Create Document record
  const documentId = await documentRepository.create(docMeta);
  const finalDoc = {
    ...docMeta,
    documentId
  };

  // Event Bus triggers
  eventBus.publish("documentUploaded", finalDoc);
  eventBus.publish("mediaUploaded", finalDoc);

  return finalDoc;
}

/**
 * Deletes an uploaded media or document.
 * Removes remote asset, removes Firestore metadata, and publishes event triggers.
 *
 * @param {string} id - The ID of the media or document.
 * @param {string} [type='media'] - Either 'media' or 'document'.
 * @returns {Promise<boolean>} True if successful.
 */
export async function deleteAsset(id, type = "media") {
  checkPermission("DELETE_MEDIA");

  if (type === "media") {
    const current = await mediaRepository.findById(id);
    if (!current) return false;

    // Delete Firestore metadata
    await mediaRepository.deleteMedia(id);

    // Event Bus
    eventBus.publish("mediaDeleted", { id, type, current });
    eventBus.publish("galleryUpdated");

    return true;
  } else {
    const current = await documentRepository.findById(id);
    if (!current) return false;

    // Delete Firestore metadata
    await documentRepository.deleteDocument(id);

    // Event Bus
    eventBus.publish("mediaDeleted", { id, type, current });

    return true;
  }
}

/**
 * Searches and filters all media and documents by criteria.
 * Supports searching by: Person, Year, Tags, Caption, Category, Uploader.
 *
 * @param {object} criteria - Filter options { person, year, tags, caption, category, uploader }
 * @returns {Promise<object[]>} Array of matching combined records.
 */
export async function searchMedia(criteria = {}) {
  const [allMedia, allDocs] = await Promise.all([
    mediaRepository.findAll(),
    documentRepository.findAll()
  ]);

  // Combine results
  const combined = [
    ...allMedia.map(m => ({ ...m, assetType: "media" })),
    ...allDocs.map(d => ({ ...d, assetType: "document" }))
  ];

  return combined.filter(asset => {
    // 1. Person filter (memberId)
    if (criteria.person && asset.memberId !== criteria.person) {
      return false;
    }

    // 2. Year filter
    if (criteria.year) {
      const assetDate = asset.createdAt || asset.uploadedAt || "";
      const assetYear = assetDate.substring(0, 4);
      if (assetYear !== String(criteria.year)) {
        return false;
      }
    }

    // 3. Tags filter
    if (criteria.tags) {
      const searchTags = Array.isArray(criteria.tags) ? criteria.tags : [criteria.tags];
      const assetTags = asset.tags || [];
      const hasAllTags = searchTags.every(t => assetTags.includes(t));
      if (!hasAllTags) {
        return false;
      }
    }

    // 4. Caption filter (match caption or title)
    if (criteria.caption) {
      const queryStr = criteria.caption.toLowerCase();
      const title = (asset.caption || asset.title || "").toLowerCase();
      if (!title.includes(queryStr)) {
        return false;
      }
    }

    // 5. Category filter
    if (criteria.category) {
      const category = (asset.category || asset.album || "").toLowerCase();
      if (category !== criteria.category.toLowerCase()) {
        return false;
      }
    }

    // 6. Uploader filter (uploadedBy)
    if (criteria.uploader && asset.uploadedBy !== criteria.uploader) {
      return false;
    }

    return true;
  });
}
