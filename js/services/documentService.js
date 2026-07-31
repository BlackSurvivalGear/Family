/**
 * Document Service Layer
 * Interface between the UI and the documentRepository.
 */

import * as documentRepository from "../repositories/documentRepository.js";
import { getCurrentUser } from "../firebase/auth.js";
import { canEdit, canDelete } from "../firebase/permissions.js";
import { PermissionDenied, DatabaseFailure, ValidationError } from "./errors.js";

function enforceWritePermission() {
  const user = getCurrentUser();
  if (!user || !canEdit(user)) {
    throw new PermissionDenied("You do not have permission to edit document records.");
  }
}

function enforceDeletePermission() {
  const user = getCurrentUser();
  if (!user || !canDelete(user)) {
    throw new PermissionDenied("You do not have administrative permission to delete document records.");
  }
}

export async function createDocument(data) {
  enforceWritePermission();
  if (!data || !data.title || !data.fileUrl) {
    throw new ValidationError("Document title and fileUrl are required.");
  }

  try {
    return await documentRepository.create(data);
  } catch (error) {
    throw new DatabaseFailure(`Failed to create document: ${error}`);
  }
}

export async function updateDocument(id, data) {
  enforceWritePermission();

  const current = await documentRepository.findById(id);
  if (!current) {
    throw new ValidationError(`Document record with ID [${id}] not found.`);
  }

  try {
    return await documentRepository.update(id, data);
  } catch (error) {
    throw new DatabaseFailure(`Failed to update document: ${error}`);
  }
}

export async function deleteDocument(id) {
  enforceDeletePermission();

  const current = await documentRepository.findById(id);
  if (!current) {
    return false;
  }

  try {
    return await documentRepository.deleteDocument(id);
  } catch (error) {
    throw new DatabaseFailure(`Failed to delete document: ${error}`);
  }
}

export async function getDocument(id) {
  return await documentRepository.findById(id);
}

export async function getAllDocuments() {
  return await documentRepository.findAll();
}

export async function searchDocuments(criteria) {
  return await documentRepository.search(criteria);
}
