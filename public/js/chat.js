'use strict';

/* Live chat widget. Persists a session id locally, talks to /api/chat,
   and renders the conversation. The server stores every message and
   returns an auto-reply; that responder is the seam where a human agent
   or a third-party desk would take over. */

(function () {
  const root = document.getElementById('chat');
  if (!root) return;
  const toggle = document.getElementById('chat-toggle');
  const panel = document.getElementById('chat-panel');
  const log = document.getElementById('chat-log');
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');
  const minBtn = document.getElementById('chat-min');

  const KEY = 'merkel_chat_session';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function sessionId() {
    let id;
    try { id = localStorage.getItem(KEY); } catch (e) {}
    if (!id || !/^[A-Za-z0-9_-]{8,64}$/.test(id)) {
      id = (crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '') : String(Date.now()) + Math.random().toString(36).slice(2)).slice(0, 40);
      try { localStorage.setItem(KEY, id); } catch (e) {}
    }
    return id;
  }
  const SID = sessionId();
  let loaded = false;

  function bubble(role, text) {
    const div = document.createElement('div');
    div.className = 'chat-msg ' + (role === 'user' ? 'user' : 'agent');
    div.innerHTML = esc(text);
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
    return div;
  }

  function greet() {
    if (log.children.length === 0) {
      bubble('agent', "Hi, you're through to Merkel Engineering. What are you building, and how can we help?");
    }
  }

  async function loadHistory() {
    if (loaded) return;
    loaded = true;
    try {
      const res = await fetch('/api/chat/' + SID, { headers: { Accept: 'application/json' } });
      const data = await res.json();
      if (data.messages && data.messages.length) {
        log.innerHTML = '';
        data.messages.forEach((m) => bubble(m.role, m.text));
      } else {
        greet();
      }
    } catch (e) { greet(); }
  }

  function open() {
    root.classList.add('open');
    panel.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    loadHistory();
    setTimeout(() => input.focus(), 60);
  }
  function close() {
    root.classList.remove('open');
    panel.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
  }

  toggle.addEventListener('click', () => (root.classList.contains('open') ? close() : open()));
  if (minBtn) minBtn.addEventListener('click', close);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    bubble('user', text);
    input.value = '';
    const typing = document.createElement('div');
    typing.className = 'chat-msg agent typing';
    typing.textContent = 'Typing';
    log.appendChild(typing);
    log.scrollTop = log.scrollHeight;
    try {
      const res = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ sessionId: SID, text })
      });
      const data = await res.json().catch(() => ({}));
      typing.remove();
      if (res.ok && data.reply) bubble('agent', data.reply.text);
      else bubble('agent', 'Sorry, something went wrong. Please email studio@merkel.engineering.');
    } catch (err) {
      typing.remove();
      bubble('agent', 'Network error. Please email studio@merkel.engineering.');
    }
  });
})();
