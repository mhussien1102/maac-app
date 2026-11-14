/**
 * Conversations service — list / read / create / append.
 * Data lives in localStorage, one list per signed-in person — admin and users never see each other's conversations (only the two demo accounts start with samples).
 * To connect a real back-end, keep the same method names and make them async.
 */

import { storage } from '../core/storage.js';
import { bus } from '../core/event-bus.js';
import { truncateWords } from '../core/format.js';
import { SEED_CONVERSATIONS } from '../data/conversations.seed.js';
import { ADMIN_USERS, DEMO_USER } from '../data/users.seed.js';
import { authService } from './auth.service.js';

let cache = null;
let cacheKey = null;

const keyFor = (user) => `conversations:${user?.id ?? 'guest'}`;
// Sample conversations for the two demo accounts (admin + demo user); every other person starts empty.
const hasSamples = (user) =>
  user?.id === DEMO_USER.id || user?.email === DEMO_USER.email
  || ADMIN_USERS.some((admin) => admin.id === user?.id || admin.email === user?.email);
const seedFor = (user) => (hasSamples(user) ? SEED_CONVERSATIONS : []);

function load() {
  const user = authService.getUser();
  const key = keyFor(user);
  if (cache === null || cacheKey !== key) {
    cacheKey = key;
    cache = storage.get(key) ?? structuredClone(seedFor(user));
  }
  return cache;
}

function persist() {
  storage.set(cacheKey, cache);
  bus.emit('conversations:changed');
}

const uid = (prefix) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const conversationsService = {
  /** Newest first. */
  list() {
    return load();
  },

  get(id) {
    return load().find((conversation) => conversation.id === id) ?? null;
  },

  latest() {
    return load()[0] ?? null;
  },

  /** Creates a conversation whose title comes from the first user message. */
  create(firstMessageText) {
    const conversation = {
      id: uid('c'),
      title: truncateWords(firstMessageText, 6),
      messages: [],
    };
    load().unshift(conversation);
    persist();
    return conversation;
  },

  addMessage(conversationId, message) {
    const conversation = this.get(conversationId);
    if (!conversation) return null;
    const saved = { id: uid('m'), ...message };
    conversation.messages.push(saved);
    persist();
    return saved;
  },

  /** Restores the demo data (handy while developing). */
  reset() {
    load();
    cache = structuredClone(seedFor(authService.getUser()));
    persist();
  },
};
