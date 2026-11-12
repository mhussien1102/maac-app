/**
 * Export service — everything runs in the browser (no libraries):
 *   • conversation  → .txt
 *   • message       → Excel (.csv), Word (.doc) or PDF (print dialog → "Save as PDF")
 */

import { escapeHtml } from '../core/html.js';

/* ----------------------------------------------------------------- helpers */

function downloadBlob(fileName, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const safeFileName = (name) =>
  String(name).replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60) || 'maac';

const sourceLine = (source) => `المصدر: ${source.file} · صفحة ${source.page}`;

/* -------------------------------------------------------------- plain text */

export function messageToPlainText(message) {
  if (message.role === 'user') return message.text;

  const parts = message.blocks.map((block) => {
    switch (block.type) {
      case 'text':
        return block.text;
      case 'list':
        return block.items.map((item) => `- ${item}`).join('\n');
      case 'table':
        return block.rows.map((row) => `${row.label}: ${row.value}`).join('\n');
      default:
        return '';
    }
  });
  if (message.source) parts.push(sourceLine(message.source));
  return parts.join('\n\n');
}

export function conversationToText(conversation) {
  const lines = [conversation.title, '='.repeat(Math.min(conversation.title.length, 40)), ''];
  for (const message of conversation.messages) {
    lines.push(message.role === 'user' ? 'أنت:' : 'المساعد:');
    lines.push(messageToPlainText(message), '');
  }
  return lines.join('\n');
}

export function exportConversation(conversation) {
  // BOM so Windows Notepad opens the Arabic text as UTF-8.
  const blob = new Blob(['﻿', conversationToText(conversation)], { type: 'text/plain;charset=utf-8' });
  downloadBlob(`${safeFileName(conversation.title)}.txt`, blob);
}

/* ----------------------------------------------------------- message export */

const csvCell = (value) => `"${String(value).replace(/"/g, '""')}"`;

function messageToCsv(message) {
  const tables = message.blocks.filter((block) => block.type === 'table');
  return tables
    .map((table) => [['البند', 'القيمة'], ...table.rows.map((row) => [row.label, row.value])])
    .map((rows) => rows.map((cells) => cells.map(csvCell).join(',')).join('\r\n'))
    .join('\r\n\r\n');
}

function messageToHtmlDocument(message, title) {
  const body = message.blocks
    .map((block) => {
      if (block.type === 'text') return `<p>${escapeHtml(block.text)}</p>`;
      if (block.type === 'list') {
        return `<ul>${block.items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
      }
      if (block.type === 'table') {
        const rows = block.rows
          .map((row) => `<tr><td>${escapeHtml(row.label)}</td><td dir="ltr"><b>${escapeHtml(row.value)}</b></td></tr>`)
          .join('');
        return `<table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%">${rows}</table>`;
      }
      return '';
    })
    .join('');

  const source = message.source ? `<p><small>${escapeHtml(sourceLine(message.source))}</small></p>` : '';

  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>body{font-family:Tahoma,Arial,sans-serif;line-height:1.9;padding:24px}h1{font-size:20px}td{font-size:14px}</style>
</head><body><h1>${escapeHtml(title)}</h1>${body}${source}</body></html>`;
}

function printHtml(documentHtml) {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;inset-inline-start:-9999px;width:800px;height:600px;border:0';
  frame.srcdoc = documentHtml;
  frame.onload = () => {
    frame.contentWindow.focus();
    frame.contentWindow.print();
    setTimeout(() => frame.remove(), 2000);
  };
  document.body.append(frame);
}

/**
 * @param {object} message assistant message
 * @param {'excel'|'word'|'pdf'} format
 * @param {string} title   used as file name / document title
 */
export function exportMessage(message, format, title) {
  const name = safeFileName(title);

  if (format === 'excel') {
    // BOM → Excel detects UTF-8 and shows Arabic correctly.
    downloadBlob(`${name}.csv`, new Blob(['﻿', messageToCsv(message)], { type: 'text/csv;charset=utf-8' }));
  } else if (format === 'word') {
    downloadBlob(`${name}.doc`, new Blob(['﻿', messageToHtmlDocument(message, title)], { type: 'application/msword' }));
  } else if (format === 'pdf') {
    printHtml(messageToHtmlDocument(message, title));
  }
}
