/**
 * Standard Service Layer Error Responses
 * Extends the native Error class to provide clean, identifiable backend responses.
 */

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
  }
}

export class PermissionDenied extends Error {
  constructor(message) {
    super(message);
    this.name = "PermissionDenied";
  }
}

export class DuplicateRecord extends Error {
  constructor(message) {
    super(message);
    this.name = "DuplicateRecord";
  }
}

export class RelationshipConflict extends Error {
  constructor(message) {
    super(message);
    this.name = "RelationshipConflict";
  }
}

export class CircularRelationship extends Error {
  constructor(message) {
    super(message);
    this.name = "CircularRelationship";
  }
}

export class DatabaseFailure extends Error {
  constructor(message) {
    super(message);
    this.name = "DatabaseFailure";
  }
}
