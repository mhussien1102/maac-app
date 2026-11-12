/**
 * Assistant service — returns an answer for a question.
 *
 * ⚠️ MOCK: it matches keywords and returns canned answers after a short delay.
 * Replace the body of `ask()` with a real request, e.g.
 *
 *   const res = await fetch('/api/chat', { method: 'POST', body: JSON.stringify({ question }) });
 *   return res.json();   // → { role: 'assistant', blocks: [...], source?: {...}, thinking?: [...] }
 */

import { wait } from '../core/dom.js';
import { ANSWER_RULES, ANSWER_FALLBACK } from '../data/conversations.seed.js';

export const assistantService = {
  /**
   * @param {string} question
   * @returns {Promise<object>} an assistant message (without id)
   */
  async ask(question) {
    await wait(900 + Math.random() * 600);
    const rule = ANSWER_RULES.find(({ test }) => test.test(question));
    return structuredClone(rule ? rule.answer : ANSWER_FALLBACK);
  },
};
