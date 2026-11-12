/**
 * Files service — the dataset files the assistant learns from.
 *
 * ⚠️ MOCK: files are NOT uploaded anywhere; only their metadata is stored and
 * "indexing" is simulated with a timer. Swap `addFiles()` for a real upload.
 */

import { storage } from '../core/storage.js';
import { bus } from '../core/event-bus.js';
import { getExtension } from '../core/format.js';
import { SEED_FILES } from '../data/files.seed.js';
import { ADMIN_USERS, DEMO_USER } from '../data/users.seed.js';
import { authService } from './auth.service.js';

const EXTENSIONS = {
  pdf: 'pdf',
  doc: 'word',
  docx: 'word',
  xls: 'excel',
  xlsx: 'excel',
  csv: 'excel',
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  webp: 'image',
};

/** Value for <input accept="…"> */
export const ACCEPTED_FILES = Object.keys(EXTENSIONS)
  .map((ext) => `.${ext}`)
  .join(',');

// One file list per signed-in person (only the two demo accounts start with sample files).
let cache = null;
let cacheKey = null;

function load() {
  const user = authService.getUser();
  const key = `files:${user?.id ?? 'guest'}`;
  if (cache === null || cacheKey !== key) {
    cacheKey = key;
    const stored = storage.get(key);
    const seed = user?.id === DEMO_USER.id || ADMIN_USERS.some((admin) => admin.id === user?.id) ? SEED_FILES : [];
    // A page reload cancels the simulated indexing, so treat unfinished files as done.
    cache = (stored ?? structuredClone(seed)).map((file) => ({ ...file, status: 'indexed' }));
  }
  return cache;
}

function persist() {
  storage.set(cacheKey, cache);
  bus.emit('files:changed');
}

/** Pretends the file is being processed, then marks it as indexed. */
function simulateIndexing(record) {
  const delay = 1400 + Math.random() * 1600;
  setTimeout(() => {
    record.status = 'indexed';
    persist();
  }, delay);
}

export const classifyFile = (fileName) => EXTENSIONS[getExtension(fileName)] ?? null;

export const filesService = {
  /** Newest first. */
  list() {
    return load();
  },

  /**
   * Adds files to the dataset.
   * @param {File[]} files
   * @returns {{ added: object[], rejected: string[] }}
   */
  addFiles(files) {
    const added = [];
    const rejected = [];

    for (const file of files) {
      const type = classifyFile(file.name);
      if (!type) {
        rejected.push(file.name);
        continue;
      }
      const record = {
        id: `f-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        name: file.name,
        type,
        status: 'indexing',
      };
      load().unshift(record);
      added.push(record);
    }

    if (added.length) {
      persist();
      added.forEach(simulateIndexing);
    }
    return { added, rejected };
  },
};
