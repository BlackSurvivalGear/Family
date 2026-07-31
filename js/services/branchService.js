/**
 * Branch Service Layer
 * Interface between the UI and the branchRepository.
 */

import * as branchRepository from "../repositories/branchRepository.js";
import { getCurrentUser } from "../firebase/auth.js";
import { canEdit, canDelete } from "../firebase/permissions.js";
import { PermissionDenied, DatabaseFailure, ValidationError } from "./errors.js";

function enforceWritePermission() {
  const user = getCurrentUser();
  if (!user || !canEdit(user)) {
    throw new PermissionDenied("You do not have permission to edit branch records.");
  }
}

function enforceDeletePermission() {
  const user = getCurrentUser();
  if (!user || !canDelete(user)) {
    throw new PermissionDenied("You do not have administrative permission to delete branch records.");
  }
}

export async function createBranch(data) {
  enforceWritePermission();
  if (!data || !data.name) {
    throw new ValidationError("Branch name is required.");
  }

  try {
    return await branchRepository.create(data);
  } catch (error) {
    throw new DatabaseFailure(`Failed to create branch: ${error}`);
  }
}

export async function updateBranch(id, data) {
  enforceWritePermission();

  const current = await branchRepository.findById(id);
  if (!current) {
    throw new ValidationError(`Branch with ID [${id}] not found.`);
  }

  try {
    return await branchRepository.update(id, data);
  } catch (error) {
    throw new DatabaseFailure(`Failed to update branch: ${error}`);
  }
}

export async function deleteBranch(id) {
  enforceDeletePermission();

  const current = await branchRepository.findById(id);
  if (!current) {
    return false;
  }

  try {
    return await branchRepository.deleteBranch(id);
  } catch (error) {
    throw new DatabaseFailure(`Failed to delete branch: ${error}`);
  }
}

export async function getBranch(id) {
  return await branchRepository.findById(id);
}

export async function getAllBranches() {
  return await branchRepository.findAll();
}

export async function searchBranches(criteria) {
  return await branchRepository.search(criteria);
}
