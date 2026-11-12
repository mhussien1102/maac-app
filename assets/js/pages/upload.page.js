/**
 * Page: upload.html — add files to the dataset.
 */

import { onReady, qs } from '../core/dom.js';
import { html, mount, raw } from '../core/html.js';
import { icon } from '../core/icons.js';
import { bus } from '../core/event-bus.js';
import { initAppShell } from '../components/app-shell.js';
import { showToast } from '../components/toast.js';
import { ACCEPTED_FILES, filesService } from '../services/files.service.js';

const TYPE_LABELS = { pdf: 'PDF', word: 'Word', excel: 'Excel', image: 'صورة', other: 'ملف' };

/* ------------------------------------------------------------------ views */

function statusBadge(file) {
  if (file.status === 'indexed') {
    return html`
      <span class="badge badge--success">
        ${raw(icon('check', { size: 16 }))}
        <span>تمت الفهرسة</span>
      </span>
    `;
  }
  return html`
    <span class="badge badge--warning">
      ${raw(icon('loader-circle', { size: 16, className: 'is-spinning' }))}
      <span>جاري الفهرسة</span>
    </span>
  `;
}

const fileRow = (file) => html`
  <tr>
    <td><span class="file-badge file-badge--${file.type}">${TYPE_LABELS[file.type]}</span></td>
    <td class="files-table__name"><bdi dir="ltr">${file.name}</bdi></td>
    <td>${statusBadge(file)}</td>
  </tr>
`;

const emptyRow = html`
  <tr><td colspan="3" class="data-table__empty">لسه مفيش ملفات — اسحب ملفاتك فوق أو اختارها من جهازك.</td></tr>
`;

/* --------------------------------------------------------------- behaviour */

function handleFiles(files) {
  if (!files.length) return;
  const { added, rejected } = filesService.addFiles(files);
  if (added.length) showToast(`اتضاف ${added.length} ملف وبيتفهرس دلوقتي`);
  if (rejected.length) showToast('نوع الملف مش مدعوم', { iconName: 'circle-alert' });
}

function setupDropzone() {
  const zone = qs('#dropzone');
  const input = qs('#file-input');
  input.accept = ACCEPTED_FILES;

  qs('#pick-files').addEventListener('click', () => input.click());
  input.addEventListener('change', () => {
    handleFiles([...input.files]);
    input.value = '';
  });

  ['dragenter', 'dragover'].forEach((type) =>
    zone.addEventListener(type, (event) => {
      event.preventDefault();
      zone.classList.add('is-dragover');
    }),
  );

  zone.addEventListener('dragleave', (event) => {
    if (!zone.contains(event.relatedTarget)) zone.classList.remove('is-dragover');
  });

  zone.addEventListener('drop', (event) => {
    event.preventDefault();
    zone.classList.remove('is-dragover');
    handleFiles([...event.dataTransfer.files]);
  });
}

onReady(() => {
  if (!initAppShell({ active: 'upload' })) return;   // not signed in → already redirecting to login.html

  const body = qs('#files-body');
  const render = () => {
    const files = filesService.list();
    mount(body, files.length ? files.map(fileRow) : emptyRow);
  };
  render();
  bus.on('files:changed', render);

  setupDropzone();
});
