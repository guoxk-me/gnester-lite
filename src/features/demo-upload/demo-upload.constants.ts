// CN: 常量文件，集中 demo-upload 的稳定标识；EN: Constants file centralizes stable identifiers for demo-upload.
export const DEMO_UPLOAD_MAX_FILE_SIZE_BYTES = 1024 * 1024;
export const DEMO_UPLOAD_MAX_FILES = 3;
export const DEMO_UPLOAD_IMAGE_FILE_TYPES =
  /^(image\/jpeg|image\/png|image\/webp)$/;
// AI modified: split chunked upload limits from the small multipart examples.
export const DEMO_UPLOAD_CHUNK_FIELD_NAME = 'chunk';
export const DEMO_UPLOAD_MAX_CHUNK_SIZE_BYTES = 1024 * 1024;
export const DEMO_UPLOAD_MAX_CHUNKED_FILE_SIZE_BYTES = 20 * 1024 * 1024;
export const DEMO_UPLOAD_MAX_CHUNKS = 200;
export const DEMO_UPLOAD_STORAGE_ROOT = 'DEMO_UPLOAD_STORAGE_ROOT';
