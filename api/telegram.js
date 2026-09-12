// Telegram Bot API — outbound messages with inline keyboards, and long
// polling for the button taps. No webhooks, no public URL (see CLAUDE.md).

function apiUrl(token, method) {
  return `https://api.telegram.org/bot${token}/${method}`;
}

async function callApi(token, method, body) {
  const res = await fetch(apiUrl(token, method), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!data.ok) console.error(`telegram ${method} failed:`, data.description);
  return data;
}

// tracks the messages sent for the currently open ask, so taps on any of
// them (or a stale one) can be resolved consistently
let openMessageRefs = [];

async function notifyAsk(token, ask, people) {
  openMessageRefs = [];
  for (const personId of ask.asked) {
    const person = people.find(p => p.id === personId);
    if (!person || !person.telegram_chat_id) continue;

    const data = await callApi(token, 'sendMessage', {
      chat_id: person.telegram_chat_id,
      text: `Hey ${person.name} — ${ask.text}\n\n${ask.reason}`,
      reply_markup: {
        inline_keyboard: [[
          { text: "I've got it", callback_data: `resolve:${ask.id}` },
          { text: "Can't", callback_data: `decline:${ask.id}` }
        ]]
      }
    });
    if (data.ok) openMessageRefs.push({ chatId: person.telegram_chat_id, messageId: data.result.message_id });
  }
}

async function clearKeyboards(token, resolvedText) {
  for (const ref of openMessageRefs) {
    await callApi(token, 'editMessageText', {
      chat_id: ref.chatId,
      message_id: ref.messageId,
      text: resolvedText,
      reply_markup: { inline_keyboard: [] }
    });
  }
  openMessageRefs = [];
}

async function answerCallback(token, callbackQueryId, text) {
  await callApi(token, 'answerCallbackQuery', { callback_query_id: callbackQueryId, text });
}

// long polling: getUpdates blocks server-side up to `timeout` seconds, so
// this loop is cheap and needs no public URL or webhook
async function pollUpdates(token, onCallback) {
  let offset = 0;
  while (true) {
    try {
      const res = await fetch(apiUrl(token, 'getUpdates') + `?timeout=25&offset=${offset}`);
      const data = await res.json();
      if (!data.ok) { await sleep(3000); continue; }

      for (const update of data.result) {
        offset = update.update_id + 1;
        if (update.callback_query) {
          await onCallback(update.callback_query);
        } else if (update.message) {
          // setup convenience: makes it easy to find a chat_id to put in seed.js
          console.log(`Telegram message from ${update.message.chat.first_name || update.message.chat.username} — chat_id: ${update.message.chat.id}`);
        }
      }
    } catch (err) {
      console.error('telegram poll error:', err.message);
      await sleep(3000);
    }
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

module.exports = { notifyAsk, clearKeyboards, answerCallback, pollUpdates };
