'use strict';

const chatStore = require('../utils/chatStore');

function clean(str, max) {
  return String(str == null ? '' : str).trim().slice(0, max);
}

// Lightweight rule-based responder. This is the seam where a real agent,
// a human hand-off, or a third-party desk (Intercom, etc.) would plug in.
function autoReply(text) {
  const t = text.toLowerCase();
  const has = (...words) => words.some((w) => t.includes(w));

  if (has('hello', 'hi ', 'hey', 'good morning', 'good afternoon') || t === 'hi') {
    return "Hi, you're through to Merkel Engineering. What are you building, and how can we help?";
  }
  if (has('career', 'job', 'hiring', 'vacancy', 'apply', 'position', 'role')) {
    return 'We are hiring across structural, civil, mechanical and digital teams. You can see open roles on our Careers page, or tell me which discipline interests you.';
  }
  if (has('quote', 'cost', 'price', 'fee', 'budget')) {
    return 'Fees depend on scope and stage. If you share a short project brief along with your email, a principal engineer will come back to you with a considered response.';
  }
  if (has('project', 'portfolio', 'work', 'reference', 'example')) {
    return 'You can browse selected projects on our Projects page, spanning towers, bridges, industrial plant and transit. Is there a sector you would like to see?';
  }
  if (has('bridge', 'structural', 'seismic', 'civil', 'mechanical', 'hvac', 'bim', 'digital twin', 'facade')) {
    return 'That is squarely in our wheelhouse. Share a few details about the project and where it gets difficult, and we will point you to the right engineer.';
  }
  if (has('contact', 'call', 'phone', 'email', 'meet', 'speak')) {
    return 'The fastest route is the contact page, or email studio@merkel.engineering. Leave your email here and we will reach out within two working days.';
  }
  if (has('thanks', 'thank you', 'cheers', 'great')) {
    return 'Any time. Anything else I can help with?';
  }
  return "Thanks for the message. A member of the studio will follow up. If you leave your email and a one-line brief, we'll route it to the right engineer.";
}

exports.postMessage = async (req, res, next) => {
  try {
    const sessionId = clean(req.body.sessionId, 64);
    const text = clean(req.body.text, 2000);

    if (!chatStore.isValidId(sessionId)) {
      return res.status(422).json({ error: 'invalid_session', message: 'Missing or malformed session id.' });
    }
    if (text.length < 1) {
      return res.status(422).json({ error: 'empty_message', message: 'Message cannot be empty.' });
    }

    const now = new Date().toISOString();
    const userMsg = { role: 'user', text, at: now };
    const botMsg = { role: 'agent', text: autoReply(text), at: new Date(Date.now() + 1).toISOString() };

    await chatStore.append(sessionId, [userMsg, botMsg]);
    return res.status(201).json({ ok: true, reply: botMsg });
  } catch (err) {
    return next(err);
  }
};

exports.getHistory = async (req, res, next) => {
  try {
    const sessionId = clean(req.params.sessionId, 64);
    if (!chatStore.isValidId(sessionId)) {
      return res.status(422).json({ error: 'invalid_session', message: 'Malformed session id.' });
    }
    const convo = await chatStore.load(sessionId);
    return res.json({ sessionId, messages: convo.messages });
  } catch (err) {
    return next(err);
  }
};
