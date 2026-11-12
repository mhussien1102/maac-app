/**
 * Chat message rendering + behaviour.
 *
 *   mount(thread, renderMessage(message))        → markup
 *   bindMessageActions(thread, { title })        → copy / export / "think" toggle (event delegation)
 */

import { html, raw } from '../core/html.js';
import { icon } from '../core/icons.js';
import { delegate } from '../core/dom.js';
import { exportMessage, messageToPlainText } from '../services/export.service.js';
import { showToast } from './toast.js';

/* ------------------------------------------------------------------ blocks */

function renderBlock(block) {
  switch (block.type) {
    case 'text':
      return html`<p class="message__text">${block.text}</p>`;

    case 'list':
      return html`<ul class="message__list">${block.items.map((item) => html`<li>${item}</li>`)}</ul>`;

    case 'table':
      return html`
        <div class="answer-table" role="table">
          ${block.rows.map(
            (row) => html`
              <div class="answer-table__row" role="row">
                <span class="answer-table__label" role="rowheader">${row.label}</span>
                <span class="answer-table__value ${row.highlight ? 'answer-table__value--highlight' : ''}" role="cell">${row.value}</span>
              </div>
            `,
          )}
        </div>
      `;

    default:
      return '';
  }
}

/* ---------------------------------------------------------------- messages */

function renderUserMessage(message) {
  return html`
    <article class="message message--user" data-message-id="${message.id}">
      <div class="message__bubble">${message.text}</div>
    </article>
  `;
}

function renderAssistantMessage(message) {
  const hasTable = message.blocks.some((block) => block.type === 'table');

  return html`
    <article class="message message--assistant" data-message-id="${message.id}">
      <div class="message__avatar" aria-hidden="true">${raw(icon('trending-up', { size: 26 }))}</div>

      <div class="message__body">
        ${message.thinking?.length
          ? html`
              <button type="button" class="thinking__toggle" data-action="toggle-thinking" aria-expanded="false">
                ${raw(icon('chevron-down', { size: 16 }))}
                <span>فكّر قبل الإجابة</span>
              </button>
              <ul class="thinking__panel" hidden>${message.thinking.map((step) => html`<li>${step}</li>`)}</ul>
            `
          : ''}

        <div class="message__content">${message.blocks.map(renderBlock)}</div>

        <div class="message__actions">
          ${message.source
            ? html`
                <span class="source-chip">
                  المصدر: <bdi dir="ltr">${message.source.file}</bdi> · صفحة ${message.source.page}
                </span>
              `
            : ''}
          <button type="button" class="btn btn--outline btn--sm" data-action="copy">
            ${raw(icon('copy', { size: 14 }))}
            <span>نسخ</span>
          </button>
          <button type="button" class="btn btn--outline btn--sm" data-action="export" data-format="word">Word</button>
          <button type="button" class="btn btn--outline btn--sm" data-action="export" data-format="pdf">PDF</button>
          ${hasTable
            ? html`<button type="button" class="btn btn--outline btn--sm" data-action="export" data-format="excel">Excel</button>`
            : ''}
        </div>
      </div>
    </article>
  `;
}

export const renderMessage = (message) =>
  message.role === 'user' ? renderUserMessage(message) : renderAssistantMessage(message);

/** Animated "…" shown while the assistant is answering. */
export const renderTyping = () => html`
  <article class="message message--assistant" data-typing>
    <div class="message__avatar" aria-hidden="true">${raw(icon('trending-up', { size: 26 }))}</div>
    <div class="message__body">
      <div class="typing" role="status" aria-label="المساعد بيكتب"><span></span><span></span><span></span></div>
    </div>
  </article>
`;

/* --------------------------------------------------------------- behaviour */

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for non-secure contexts
    const area = document.createElement('textarea');
    area.value = text;
    area.style.cssText = 'position:fixed;opacity:0';
    document.body.append(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
}

/**
 * @param {HTMLElement} thread  element that contains the messages
 * @param {{ getMessage: (id: string) => object|undefined, title: string }} options
 */
export function bindMessageActions(thread, { getMessage, title }) {
  const messageOf = (element) => getMessage(element.closest('[data-message-id]')?.dataset.messageId);

  delegate(thread, 'click', '[data-action="toggle-thinking"]', (_event, button) => {
    const expanded = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', String(!expanded));
    button.nextElementSibling.hidden = expanded;
  });

  delegate(thread, 'click', '[data-action="copy"]', async (_event, button) => {
    const message = messageOf(button);
    if (!message || !(await copyText(messageToPlainText(message)))) return;

    const label = button.querySelector('span');
    const original = label.textContent;
    button.dataset.state = 'done';
    label.textContent = 'تم النسخ';
    setTimeout(() => {
      delete button.dataset.state;
      label.textContent = original;
    }, 1600);
  });

  delegate(thread, 'click', '[data-action="export"]', (_event, button) => {
    const message = messageOf(button);
    if (!message) return;
    exportMessage(message, button.dataset.format, title);
    if (button.dataset.format !== 'pdf') showToast('تم تجهيز الملف للتنزيل');
  });
}
