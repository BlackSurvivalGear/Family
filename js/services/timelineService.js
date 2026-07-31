/**
 * Timeline Service Layer
 * Interface between the UI and the timelineRepository.
 */

import * as timelineRepository from "../repositories/timelineRepository.js";
import { getCurrentUser } from "../firebase/auth.js";
import { canEdit, canDelete } from "../firebase/permissions.js";
import { PermissionDenied, DatabaseFailure, ValidationError } from "./errors.js";

function enforceWritePermission() {
  const user = getCurrentUser();
  if (!user || !canEdit(user)) {
    throw new PermissionDenied("You do not have permission to edit timeline records.");
  }
}

function enforceDeletePermission() {
  const user = getCurrentUser();
  if (!user || !canDelete(user)) {
    throw new PermissionDenied("You do not have administrative permission to delete timeline records.");
  }
}

export async function createTimelineRecord(data) {
  enforceWritePermission();
  if (!data || !data.year || !data.title) {
    throw new ValidationError("Year and title are required.");
  }

  try {
    return await timelineRepository.create(data);
  } catch (error) {
    throw new DatabaseFailure(`Failed to create timeline record: ${error}`);
  }
}

export async function updateTimelineRecord(id, data) {
  enforceWritePermission();

  const current = await timelineRepository.findById(id);
  if (!current) {
    throw new ValidationError(`Timeline record with ID [${id}] not found.`);
  }

  try {
    return await timelineRepository.update(id, data);
  } catch (error) {
    throw new DatabaseFailure(`Failed to update timeline record: ${error}`);
  }
}

export async function deleteTimelineRecord(id) {
  enforceDeletePermission();

  const current = await timelineRepository.findById(id);
  if (!current) {
    return false;
  }

  try {
    return await timelineRepository.deleteTimeline(id);
  } catch (error) {
    throw new DatabaseFailure(`Failed to delete timeline record: ${error}`);
  }
}

export async function getTimelineRecord(id) {
  return await timelineRepository.findById(id);
}

export async function getAllTimelineRecords() {
  return await timelineRepository.findAll();
}

export async function searchTimelineRecords(criteria) {
  return await timelineRepository.search(criteria);
}
