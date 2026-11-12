/**
 * Composer — the message box used on the home and chat pages.
 *
 *   const composer = mountComposer(el, {
 *     placeholder: 'اكتب رسالتك...',
 *     size: 'lg',                       // 'lg' = taller (home), default = compact (chat)
 *     onSubmit: (text) => { ... },
 *   });
 *   composer.focus(); composer.setDisabled(true);
 *
 * Enter sends, Shift+Enter inserts a new line. The attach button adds files to
 * the dataset through filesService.
 */

import { html, mount, raw } from '../core/html.js';
import { icon } from '../core/icons.js';
import { ACCEPTED_FILES, filesService } from '../services/files.service.js';
import { showToast } from './toast.js';

let instanceCount = 0;

export function mountComposer(container, { placeholder = 'اكتب رسالتك...', size = 'md', onSubmit } = {}) {
  const inputId = `composer-input-${++instanceCount}`;

  mount(
    container,
    html`
      <form class="composer ${size === 'lg' ? 'composer--lg' : ''}" novalidate>
        <label class="sr-only" for="${inputId}">${placeholder}</label>
        <textarea id="${inputId}" class="composer__input" rows="1" placeholder="${placeholder}"></textarea>
        <div class="composer__bar">
          <button type="button" class="icon-btn icon-btn--outline" data-action="attach" aria-label="إرفاق ملف">
            ${raw(icon('paperclip', { size: 20 }))}
          </button>
          <button type="submit" class="icon-btn icon-btn--primary" aria-label="إرسال">
            ${raw(icon('arrow-up', { size: 20 }))}
          </button>
          <input class="sr-only" type="file" multiple accept="${ACCEPTED_FILES}" data-file-input tabindex="-1" hidden>
        </div>
      </form>
    `,
  );

  const form = container.querySelector('form');
  const input = container.querySelector('textarea');
  const fileInput = container.querySelector('[data-file-input]');
  const sendButton = container.querySelector('[type="submit"]');

  const minHeight = parseFloat(getComputedStyle(input).minHeight) || 0;
  const autoGrow = () => {
    input.style.height = 'auto';
    input.style.height = `${Math.max(input.scrollHeight, minHeight)}px`;
  };

  const submit = () => {
    const text = input.value.trim();
    if (!text || sendButton.disabled) return;
    input.value = '';
    autoGrow();
    onSubmit?.(text);
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    submit();
  });

  input.addEventListener('input', autoGrow);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      submit();
    }
  });

  container.querySelector('[data-action="attach"]').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const { added, rejected } = filesService.addFiles([...fileInput.files]);
    if (added.length) showToast(`اتضاف ${added.length} ملف للداتا سيت وهيتفهرس دلوقتي`);
    if (rejected.length) showToast('نوع الملف مش مدعوم', { iconName: 'circle-alert' });
    fileInput.value = '';
  });

  return {
    focus: () => input.focus(),
    setDisabled(disabled) {
      input.disabled = disabled;
      sendButton.disabled = disabled;
    },
  };
}
