# House of Lawal — Permanent Backend Architecture

This document describes the permanent, scalable backend architecture for the House of Lawal private family portal. Designed specifically to work client-side with Firebase Auth and Firebase Firestore, with a flawless localStorage fallback for local simulation and offline execution.

---

## 1. Why the Visual Tree is NEVER Stored in Firestore

Genealogies are complex, dynamic graphs that grow multi-directionally over time. Storing the visual tree statically (e.g., as structured layouts, strict nested objects, or coordinate positions) in a database introduces critical limitations:
1. **Scalability Bottlenecks:** A single static tree document quickly exceeds Firestore's 1MB document size limit as the family approaches thousands of members.
2. **Inflexibility:** Static visual structures cannot handle multiple spouses sequentially, half-siblings, adoptions, step-parents, or diverse/non-traditional parenting models dynamically.
3. **Redundancy:** Coordinate and positional calculations belong to the presentation layer. When a relationship changes or a new sibling is added, calculating coordinate shifts in the database is extremely expensive and error-prone.

### The Graph Approach (People + Relationships Only)
Instead, our database stores only **entities** (`familyMembers`) and **edges** (`relationships`).

```
 [Member: Kolawole]                       [Member: Fatima]
        │                                        │
        └───► [Relationship: SPOUSE] ◄───────────┘
                       │
       ┌───────────────┴───────────────┐
       ▼                               ▼
 [Relationship: BIOLOGICAL_CHILD]   [Relationship: BIOLOGICAL_CHILD]
       │                               │
       ▼                               ▼
  [Member: Tunde]                 [Member: Funmi]
```

At runtime, the tree rendering engine queries these tables, traverses the relationship graph on-the-fly, constructs the adjacency structures, and renders dynamic SVG links. This ensures:
- Support for **100,000+ members** and **unlimited generations**.
- Flawless representation of **complex configurations** (e.g., unlimited spouses, half-siblings, and diverse adoptions/foster systems).
- Future-proof capabilities for **GEDCOM** file imports/exports, which natively use the `INDI` (Individual) and `FAM` (Family/Relationship) record specification.

---

## 2. Firestore Schema & Collections Specification

The architecture comprises ten core collections designed to scale independently:

### 2.1 `users`
Represents registered user accounts on the portal, mapped to their Firebase Auth UID.
* **Fields:**
  - `uid` (string, primary key)
  - `email` (string)
  - `firstName` (string)
  - `lastName` (string)
  - `displayName` (string)
  - `photoURL` (string)
  - `role` (string: e.g., `SUPER_ADMIN`, `FAMILY_ADMIN`, `BRANCH_ADMIN`, `MEMBER`, etc.)
  - `emailVerified` (boolean)
  - `generation` (number)
  - `branch` (string)
  - `active` (boolean)
  - `createdAt` (timestamp)
  - `updatedAt` (timestamp)
  - `lastLogin` (timestamp)

### 2.2 `familyMembers`
The canonical family member directory, separate from website users. One `user` can manage or be linked to a `familyMember`, but most family members are historical profiles who do not log in.
* **Fields:**
  - `memberId` (string, primary key)
  - `firstName` (string, required)
  - `middleName` (string, optional)
  - `lastName` (string, required)
  - `preferredName` (string, optional)
  - `gender` (string, required: `Male`, `Female`, `Other`, `Unknown`)
  - `birthDate` (string, ISO format YYYY-MM-DD)
  - `birthPlace` (string)
  - `deathDate` (string, ISO format YYYY-MM-DD, optional)
  - `deathPlace` (string, optional)
  - `living` (boolean, required)
  - `biography` (string)
  - `occupation` (string)
  - `education` (string)
  - `militaryService` (string)
  - `nationality` (string)
  - `languages` (string)
  - `branchId` (string, foreign key)
  - `profilePhoto` (string, URL)
  - `gallery` (array of strings, media URLs)
  - `createdBy` (string, user ID reference)
  - `createdAt` (timestamp)
  - `updatedAt` (timestamp)
  - `deleted` (boolean, soft-delete flag)

### 2.3 `relationships`
The backbone of the graph database. Every record connects exactly two members.
* **Fields:**
  - `relationshipId` (string, primary key)
  - `personA` (string, memberId)
  - `personB` (string, memberId)
  - `relationshipType` (string, required)
  - `status` (string: e.g., `Current`, `Past`)
  - `startDate` (string, YYYY-MM-DD, optional)
  - `endDate` (string, YYYY-MM-DD, optional)
  - `notes` (string, optional)
  - `createdBy` (string, user ID reference)
  - `createdAt` (timestamp)
  - `updatedAt` (timestamp)

#### Supported Relationship Types
- `BIOLOGICAL_FATHER`
- `BIOLOGICAL_MOTHER`
- `BIOLOGICAL_CHILD`
- `SPOUSE`
- `FORMER_SPOUSE`
- `ADOPTIVE_PARENT`
- `ADOPTED_CHILD`
- `STEP_PARENT`
- `STEP_CHILD`
- `FOSTER_PARENT`
- `FOSTER_CHILD`
- `GUARDIAN`
- `WARD`
- `TWIN`
- `HALF_SIBLING`

### 2.4 `branches`
Represents regional or biological branches of the family (e.g., London, Lagos, Abeokuta, New York).
* **Fields:**
  - `branchId` (string, primary key)
  - `name` (string, required)
  - `region` (string)
  - `description` (string)
  - `createdBy` (string, user ID reference)
  - `createdAt` (timestamp)
  - `updatedAt` (timestamp)

### 2.5 `events`
Shared family calendar events (birthdays, reunions, memorial tournaments).
* **Fields:**
  - `eventId` (string, primary key)
  - `title` (string, required)
  - `date` (string, YYYY-MM-DD, required)
  - `category` (string: e.g., `Reunions`, `Birthdays`, `Anniversaries`, `Meetings`)
  - `description` (string)
  - `time` (string, HH:MM, optional)
  - `createdBy` (string, user ID reference)
  - `createdAt` (timestamp)
  - `updatedAt` (timestamp)

### 2.6 `timeline`
Historical milestones representing the entire lineage over the centuries.
* **Fields:**
  - `timelineId` (string, primary key)
  - `year` (string, required)
  - `title` (string, required)
  - `description` (string)
  - `category` (string, optional)
  - `createdBy` (string, user ID reference)
  - `createdAt` (timestamp)
  - `updatedAt` (timestamp)

### 2.7 `media`
Images and video records mapped to specific members, branches, and galleries.
* **Fields:**
  - `mediaId` (string, primary key)
  - `url` (string, required)
  - `caption` (string)
  - `memberId` (string, foreign key, optional)
  - `branchId` (string, foreign key, optional)
  - `type` (string: e.g., `image`, `video`)
  - `createdBy` (string, user ID reference)
  - `createdAt` (timestamp)
  - `updatedAt` (timestamp)

### 2.8 `documents`
Archival PDFs and files (birth certificates, historical deeds, commissioning scrolls).
* **Fields:**
  - `documentId` (string, primary key)
  - `title` (string, required)
  - `fileUrl` (string, required)
  - `category` (string: e.g., `Birth Certificates`, `Marriage Certificates`, `Military Records`, `Family Documents`)
  - `size` (string, e.g., "2.4 MB")
  - `type` (string, e.g., "PDF")
  - `description` (string)
  - `createdBy` (string, user ID reference)
  - `createdAt` (timestamp)
  - `updatedAt` (timestamp)

### 2.9 `settings`
Global and user-specific configuration files.
* **Fields:**
  - `settingsId` (string, primary key)
  - `siteName` (string)
  - `theme` (string)
  - `updatedAt` (timestamp)

### 2.10 `auditLogs`
Immutable records capturing all critical write actions on the platform.
* **Fields:**
  - `auditLogId` (string, primary key)
  - `userId` (string, required)
  - `action` (string, required: `CREATE`, `UPDATE`, `DELETE`)
  - `collection` (string, required)
  - `documentId` (string, required)
  - `oldValue` (object, nullable)
  - `newValue` (object, nullable)
  - `timestamp` (timestamp, required)

---

## 3. Repository Pattern Implementation

The platform uses a reusable repository pattern to decouple business and presentation logic from database providers. No raw Firestore code resides in client UI pages.

### 3.1 Architecture Directories
- `js/validators/`: Schema and integrity checks (`memberValidator.js`, `relationshipValidator.js`).
- `js/repositories/`: Storage API abstraction modules.
  - `familyRepository.js`
  - `relationshipRepository.js`
  - `branchRepository.js`
  - `timelineRepository.js`
  - `mediaRepository.js`
  - `documentRepository.js`
  - `userRepository.js`
  - `eventRepository.js`
  - `settingsRepository.js`
  - `auditLogRepository.js`

### 3.2 Repository Method Standard
Each repository exposes:
* `create(data)`: Validates and saves a new document. Returns ID.
* `update(id, updateData)`: Merges new data, validates the complete object, updates, and returns a boolean.
* `delete(id)`: Removes or soft-deletes the document.
* `findById(id)`: Returns the detailed document or null.
* `findAll()`: Returns all active documents in the collection.
* `search(criteria)`: Offers client-side and server-side querying/filtering.

---

## 4. Integrity and Ancestry Validation

Maintaining data health is critical. The validator modules enforce strict semantic checks before execution:

### 4.1 Relationship Semantic Integrity
* **Reflexive Check:** A person cannot create a relationship with themselves (`personA !== personB`).
* **Date Bounds:** A relationship's start date cannot be after its end date.
* **Lifespan Boundaries:** A person's birth date must be chronologically before their death date, and death dates require their `living` status to be marked `false`.

### 4.2 Circular Ancestry Detection
To prevent recursive logic loops in the family tree, `relationshipValidator.js` implements a graph traversal check (`detectCircularAncestry`) using Breadth-First Search (BFS) before allowing parent-child relationships to be established or updated.

If adding a relationship makes a grandparent also a grandchild of their descendants, the transaction is rejected with an explicit validation error.
