/**
 * Media Service Layer
 * Interface between the UI and the mediaRepository.
 */

import * as mediaRepository from "../repositories/mediaRepository.js";
import { getCurrentUser } from "../firebase/auth.js";
import { canEdit, canDelete } from "../firebase/permissions.js";
import { PermissionDenied, DatabaseFailure, ValidationError } from "./errors.js";

function enforceWritePermission() {
  const user = getCurrentUser();
  if (!user || !canEdit(user)) {
    throw new PermissionDenied("You do not have permission to edit media records.");
  }
}

function enforceDeletePermission() {
  const user = getCurrentUser();
  if (!user || !canDelete(user)) {
    throw new PermissionDenied("You do not have administrative permission to delete media records.");
  }
}

export async function createMedia(data) {
  enforceWritePermission();
  if (!data || !data.url) {
    throw new ValidationError("Media URL is required.");
  }

  try {
    return await mediaRepository.create(data);
  } catch (error) {
    throw new DatabaseFailure(`Failed to create media: ${error}`);
  }
}

export async function updateMedia(id, data) {
  enforceWritePermission();

  const current = await mediaRepository.findById(id);
  if (!current) {
    throw new ValidationError(`Media record with ID [${id}] not found.`);
  }

  try {
    return await mediaRepository.update(id, data);
  } catch (error) {
    throw new DatabaseFailure(`Failed to update media: ${error}`);
  }
}

export async function deleteMedia(id) {
  enforceDeletePermission();

  const current = await mediaRepository.findById(id);
  if (!current) {
    return false;
  }

  try {
    return await mediaRepository.deleteMedia(id);
  } catch (error) {
    throw new DatabaseFailure(`Failed to delete media: ${error}`);
  }
}

export async function getMedia(id) {
  return await mediaRepository.findById(id);
}

export async function getAllMedia() {
  return await mediaRepository.findAll();
}

export async function searchMedia(criteria) {
  return await mediaRepository.search(criteria);
}
