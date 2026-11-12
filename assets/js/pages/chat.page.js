/**
 * Page: chat.html — a conversation (?id=<conversationId>).
 *
 * Flow: render the saved messages → if the last one is a question without an
 * answer (e.g. we just came from the home screen) ask the assistant →
 * every new question goes through send().
 */

import { onReady, qs } from '../core/dom.js';
import { html, mount, raw, toString } from '../core/html.js';
import { icon } from '../core/icons.js';
import { getParam, routes, chatUrl, navigate } from '../core/routes.js';
import { initAppShell } from '../components/app-shell.js';
import { mountComposer } from '../components/composer.js';
import { bindMessageActions, renderMessage, renderTyping } from '../components/message.js';
import { showToast } from '../components/toast.js';
import { conversationsService } from '../services/conversations.service.js';
import { assistantService } from '../services/assistant.service.js';
import { exportConversation } from '../services/export.service.js';

onReady(() => {
  const requestedId = getParam('id');
  const conversation = requestedId ? conversationsService.get(requestedId) : conversationsService.latest();

  // /chat.html with no id → open the latest conversation (or go home if there is none)
  if (!requestedId) {
    if (conversation) history.replaceState(null, '', chatUrl(conversation.id));
    else return navigate(routes.home);
  }

  if (!initAppShell({ active: 'history', conversationId: conversation?.id ?? null })) return;   // not signed in → already redirecting to login.html

  if (!conversation) return renderNotFound();
  renderConversation(conversation);
});

/* ------------------------------------------------------------------ views */

function renderNotFound() {
  mount(
    qs('#chat'),
    html`
      <div class="chat__not-found">
        <p>المحادثة دي مش موجودة.</p>
        <a class="btn btn--primary" href="${routes.home}">ابدأ محادثة جديدة</a>
      </div>
    `,
  );
}

function renderConversation(conversation) {
  document.title = `${conversation.title} — MAAC`;

  mount(
    qs('#chat'),
    html`
      <header class="chat__header">
        <h1 class="chat__title">${conversation.title}</h1>
        <button type="button" class="btn btn--outline btn--sm" data-action="export-conversation">
          ${raw(icon('download', { size: 14 }))}
          <span>تصدير المحادثة</span>
        </button>
      </header>

      <div class="chat__scroll" data-scroll>
        <div class="chat__thread" data-thread aria-live="polite"></div>
      </div>

      <div class="chat__composer">
        <div class="chat__composer-inner" data-composer></div>
      </div>
    `,
  );

  const scroller = qs('[data-scroll]');
  const thread = qs('[data-thread]');

  const scrollToBottom = (smooth = true) =>
    scroller.scrollTo({ top: scroller.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });

  /** Appends a rendered message and returns its element. */
  const append = (view) => {
    thread.insertAdjacentHTML('beforeend', toString(view));
    return thread.lastElementChild;
  };

  const composer = mountComposer(qs('[data-composer]'), {
    placeholder: 'اكتب رسالتك...',
    onSubmit: send,
  });

  async function answer(question) {
    composer.setDisabled(true);
    const typing = append(renderTyping());
    scrollToBottom();

    try {
      const reply = await assistantService.ask(question);
      typing.remove();
      append(renderMessage(conversationsService.addMessage(conversation.id, reply)));
    } catch {
      typing.remove();
      showToast('حصلت مشكلة، جرّب تاني', { iconName: 'circle-alert' });
    }

    composer.setDisabled(false);
    composer.focus();
    scrollToBottom();
  }

  async function send(text) {
    append(renderMessage(conversationsService.addMessage(conversation.id, { role: 'user', text })));
    scrollToBottom();
    await answer(text);
  }

  // Initial render
  conversation.messages.forEach((message) => append(renderMessage(message)));
  scrollToBottom(false);

  bindMessageActions(thread, {
    title: conversation.title,
    getMessage: (id) => conversation.messages.find((message) => message.id === id),
  });

  qs('[data-action="export-conversation"]').addEventListener('click', () => {
    exportConversation(conversation);
    showToast('تم تصدير المحادثة');
  });

  // Came from the home screen: the last message is a question nobody answered yet
  const last = conversation.messages.at(-1);
  if (last?.role === 'user') answer(last.text);
}
