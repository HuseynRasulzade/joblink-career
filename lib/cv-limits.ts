export const MAX_CV_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_CV_PAGES = 40;
export const MAX_CV_TEXT_CHARS = 60000;

export const formatCvFileLimit = () =>
  `${MAX_CV_FILE_BYTES / 1024 / 1024} MB`;
