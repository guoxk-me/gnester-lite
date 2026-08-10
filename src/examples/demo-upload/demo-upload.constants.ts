export const DEMO_UPLOAD_MAX_FILE_SIZE_BYTES = 1024 * 1024;
export const DEMO_UPLOAD_MAX_FILES = 3;
export const DEMO_UPLOAD_MAX_FORM_FIELDS = 20;
export const DEMO_UPLOAD_MAX_FORM_FIELD_SIZE_BYTES = 64 * 1024;
export const DEMO_UPLOAD_MAX_FIELD_NAME_BYTES = 100;
export const DEMO_UPLOAD_MAX_ORIGINAL_NAME_LENGTH = 120;
export const DEMO_UPLOAD_IMAGE_FILE_TYPES =
  /^(image\/jpeg|image\/png|image\/webp)$/;
// AI modified: split chunked upload limits from the small multipart examples.
export const DEMO_UPLOAD_CHUNK_FIELD_NAME = 'chunk';
export const DEMO_UPLOAD_MAX_CHUNK_SIZE_BYTES = 1024 * 1024;
export const DEMO_UPLOAD_MAX_CHUNKED_FILE_SIZE_BYTES = 20 * 1024 * 1024;
export const DEMO_UPLOAD_MAX_CHUNKS = 200;
export const DEMO_UPLOAD_STORAGE_ROOT = 'DEMO_UPLOAD_STORAGE_ROOT';
// AI modified: bound abandoned and completed upload storage even in long-running demo environments.
export const DEMO_UPLOAD_SESSION_TTL_MS = 15 * 60 * 1000;
export const DEMO_UPLOAD_COMPLETED_FILE_TTL_MS = 15 * 60 * 1000;
export const DEMO_UPLOAD_CLEANUP_INTERVAL_MS = 60 * 1000;
export const DEMO_UPLOAD_ORPHAN_RETENTION_MS = 30 * 60 * 1000;
export const DEMO_UPLOAD_MAX_ACTIVE_SESSIONS = 25;
export const DEMO_UPLOAD_MAX_RESERVED_BYTES = 100 * 1024 * 1024;
export const DEMO_UPLOAD_ASSEMBLY_STORAGE_MULTIPLIER = 2;
