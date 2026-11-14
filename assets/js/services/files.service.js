/**
 * Files service — the dataset files the assistant learns from.
 *
 * Two modes, picked automatically (see core/api.js):
 *   • server running → files are really uploaded to the MAAC server (checked there: type, content, size,
 *     viruses, per-person ownership). The browser-side checks below are only a courtesy so mistakes are
 *     caught before the upload — the SERVER is what actually enforces the rules.
 *   • no server (GitHub Pages / demo) → ⚠️ MOCK: nothing is uploaded; metadata only, "indexing" is a timer.
 */

import { storage } from '../core/storage.js';
import { bus } from '../core/event-bus.js';
import { api, useApi } from '../core/api.js';
import { getExtension } from '../core/format.js';
import { SEED_FILES } from '../data/files.seed.js';
import { ADMIN_USERS, DEMO_USER } from '../data/users.seed.js';
import { authService } from './auth.service.js';

// Same allow-list as the server. Old .doc / .xls are NOT accepted: that format can hide macros nobody can inspect.
const EXTENSIONS = {
  pdf: 'pdf',
  docx: 'word',
  xlsx: 'excel',
  csv: 'excel',
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  webp: 'image',
};

export const MAX_UPLOAD_MB = 20;

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
    const seed = user?.id === DEMO_USER.id || user?.email === DEMO_USER.email
      || ADMIN_USERS.some((admin) => admin.id === user?.id || admin.email === user?.email) ? SEED_FILES : [];
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

const mockFiles = {
  /** Newest first. */
  list() {
    return load();
  },

  loading: () => false,
  async remove() {},

  /**
   * Adds files to the dataset.
   * @param {File[]} files
   * @returns {{ added: object[], rejected: string[], tooLarge: string[] }}
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
    return { added, rejected, tooLarge: [] };
  },
};

/* ------------------------------------------------------------- real server */

// What the page shows: files the server has + the ones still on their way up (status "uploading").
let remote = [];
let remoteUserId = null;
let loadedOnce = false;
let loadingNow = null;
let uploads = Promise.resolve();    // uploads go one after the other (kind to the server and to a slow connection)

const toRecord = (row) => ({ id: row.id, name: row.name, type: row.kind, status: row.status, size: row.size });

function forgetOtherUser() {
  const id = authService.getUser()?.id ?? null;
  if (id !== remoteUserId) {
    remoteUserId = id;
    remote = [];
    loadedOnce = false;
    loadingNow = null;
  }
}

/** Loads the list from the server (once per page, and again whenever something changes). */
function refresh() {
  forgetOtherUser();
  loadingNow ??= api.get('/files')
    .then(({ files }) => {
      const onTheWay = remote.filter((file) => file.status === 'uploading');
      remote = [...onTheWay, ...files.map(toRecord)];
    })
    .catch(() => { /* offline or signed out: keep what we have; auth:expired is handled elsewhere */ })
    .finally(() => {
      loadedOnce = true;
      loadingNow = null;
      bus.emit('files:changed');
    });
  return loadingNow;
}

function startUpload(record, file) {
  uploads = uploads.then(async () => {
    try {
      const { file: saved } = await api.upload('/files', file);
      remote = remote.map((item) => (item.id === record.id ? toRecord(saved) : item));
    } catch (error) {
      remote = remote.filter((item) => item.id !== record.id);
      bus.emit('files:error', { name: file.name, message: error.message });
    }
    bus.emit('files:changed');
  });
}

const remoteFiles = {
  list() {
    forgetOtherUser();
    if (!loadedOnce && !loadingNow) refresh();
    return remote;
  },

  loading: () => !loadedOnce,

  addFiles(files) {
    forgetOtherUser();
    const added = [];
    const rejected = [];
    const tooLarge = [];

    for (const file of files) {
      const type = classifyFile(file.name);
      if (!type) rejected.push(file.name);
      else if (file.size > MAX_UPLOAD_MB * 1024 * 1024) tooLarge.push(file.name);
      else if (file.size === 0) rejected.push(file.name);
      else {
        const record = { id: `up-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, name: file.name, type, status: 'uploading' };
        remote.unshift(record);
        added.push(record);
        startUpload(record, file);
      }
    }
    if (added.length) bus.emit('files:changed');
    return { added, rejected, tooLarge };
  },

  async remove(id) {
    const before = remote;
    remote = remote.filter((file) => file.id !== id);
    bus.emit('files:changed');
    try {
      await api.delete(`/files/${encodeURIComponent(id)}`);
    } catch (error) {
      remote = before;
      bus.emit('files:changed');
      bus.emit('files:error', { name: before.find((file) => file.id === id)?.name ?? '', message: error.message });
    }
  },
};

export const filesService = useApi ? { ...mockFiles, ...remoteFiles } : mockFiles;
