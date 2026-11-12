/**
 * Page: index.html — start a new conversation.
 */

import { onReady, qs } from '../core/dom.js';
import { chatUrl, navigate } from '../core/routes.js';
import { initAppShell } from '../components/app-shell.js';
import { mountComposer } from '../components/composer.js';
import { conversationsService } from '../services/conversations.service.js';

/** Creates the conversation with the first question and opens it. */
function startConversation(text) {
  const conversation = conversationsService.create(text);
  conversationsService.addMessage(conversation.id, { role: 'user', text });
  navigate(chatUrl(conversation.id));   // chat.page.js answers the pending question
}

onReady(() => {
  if (!initAppShell({ active: null })) return;   // not signed in → already redirecting to login.html

  mountComposer(qs('#composer'), {
    placeholder: 'اسأل عن أي شيء في ملفاتك...',
    size: 'lg',
    onSubmit: startConversation,
  });

  qs('#suggestions').addEventListener('click', (event) => {
    const chip = event.target.closest('.suggestion');
    if (chip) startConversation(chip.textContent.trim());
  });
});
