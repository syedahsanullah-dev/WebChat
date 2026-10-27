export interface TranscriptChatInfo {
  id: string;
  title: string;
  isGroup: boolean;
  participants: string[];
  exportedAt: string;
  totalMessages: number;
  isLegalHold?: boolean;
}

export interface TranscriptMessage {
  id: string;
  senderName: string;
  senderUsername: string;
  content: string;
  messageType: string;
  mediaUrl?: string | null;
  createdAt: string;
  status?: string;
  isDeleted?: boolean;
}

export function generateHtmlTranscript(
  chatInfo: TranscriptChatInfo,
  messages: TranscriptMessage[]
): string {
  const escapeHtml = (text: string): string => {
    return (text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const messageRows = messages
    .map((msg) => {
      const time = new Date(msg.createdAt).toLocaleString([], {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
      const isBot = msg.messageType === 'system_bot';
      const isSystem = msg.messageType === 'system';

      if (isSystem || isBot) {
        return `
        <div class="system-message">
          <div class="system-bubble">
            ${isBot ? '<span class="bot-badge">BOT</span>' : ''}
            <span>${escapeHtml(msg.content)}</span>
            <span class="time">${time}</span>
          </div>
        </div>`;
      }

      return `
      <div class="message-row">
        <div class="message-bubble ${msg.isDeleted ? 'deleted' : ''}">
          <div class="sender-header">
            <span class="sender-name">${escapeHtml(msg.senderName)}</span>
            <span class="sender-user">@${escapeHtml(msg.senderUsername)}</span>
          </div>
          <div class="message-content">
            ${msg.isDeleted ? '<em>🚫 This message was deleted</em>' : escapeHtml(msg.content)}
          </div>
          ${
            msg.mediaUrl && !msg.isDeleted
              ? `<div class="media-link"><a href="${escapeHtml(msg.mediaUrl)}" target="_blank">📎 Attachment</a></div>`
              : ''
          }
          <div class="timestamp">${time}</div>
        </div>
      </div>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Compliance Export: ${escapeHtml(chatInfo.title)}</title>
  <style>
    :root {
      --wa-bg: #efeae2;
      --wa-header: #008069;
      --wa-bubble: #ffffff;
      --wa-text: #111b21;
      --wa-muted: #667781;
      --wa-border: #e9edef;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --wa-bg: #0b141a;
        --wa-header: #202c33;
        --wa-bubble: #202c33;
        --wa-text: #e9edef;
        --wa-muted: #8696a0;
        --wa-border: #222d34;
      }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--wa-bg);
      color: var(--wa-text);
      line-height: 1.5;
      padding-bottom: 40px;
    }
    .header {
      background-color: var(--wa-header);
      color: #ffffff;
      padding: 20px 24px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header h1 { font-size: 20px; font-weight: 600; margin-bottom: 6px; }
    .header .meta { font-size: 13px; opacity: 0.9; }
    .legal-hold-badge {
      display: inline-block;
      background: #eab308;
      color: #000;
      font-weight: bold;
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 4px;
      margin-top: 8px;
    }
    .container {
      max-width: 800px;
      margin: 20px auto;
      padding: 0 16px;
    }
    .info-card {
      background: var(--wa-bubble);
      border: 1px solid var(--wa-border);
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
      font-size: 13px;
    }
    .info-card h2 { font-size: 14px; margin-bottom: 8px; }
    .messages-container { display: flex; flex-direction: column; gap: 10px; }
    .message-row { display: flex; justify-content: flex-start; }
    .message-bubble {
      background: var(--wa-bubble);
      border: 1px solid var(--wa-border);
      border-radius: 8px;
      padding: 8px 12px;
      max-width: 85%;
      box-shadow: 0 1px 0.5px rgba(0,0,0,0.06);
    }
    .message-bubble.deleted { font-style: italic; opacity: 0.8; }
    .sender-header { font-size: 12px; margin-bottom: 3px; }
    .sender-name { font-weight: 600; color: #00a884; }
    .sender-user { font-size: 11px; color: var(--wa-muted); margin-left: 4px; }
    .message-content { font-size: 14px; white-space: pre-wrap; word-break: break-word; }
    .timestamp { font-size: 11px; color: var(--wa-muted); text-align: right; margin-top: 4px; }
    .media-link { margin-top: 6px; font-size: 12px; }
    .media-link a { color: #0284c7; text-decoration: none; }
    .system-message { display: flex; justify-content: center; margin: 6px 0; }
    .system-bubble {
      background: rgba(0,0,0,0.05);
      border-radius: 6px;
      padding: 4px 10px;
      font-size: 12px;
      color: var(--wa-muted);
      text-align: center;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .bot-badge {
      background: #4f46e5;
      color: #fff;
      font-size: 9px;
      font-weight: bold;
      padding: 1px 4px;
      border-radius: 2px;
    }
    .time { font-size: 10px; opacity: 0.7; }
    .footer { text-align: center; font-size: 12px; color: var(--wa-muted); margin-top: 30px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${escapeHtml(chatInfo.title)}</h1>
    <div class="meta">Exported on: ${escapeHtml(chatInfo.exportedAt)} UTC &bull; ${chatInfo.totalMessages} Messages</div>
    ${chatInfo.isLegalHold ? '<div class="legal-hold-badge">LEGAL HOLD PRESERVED ARCHIVE</div>' : ''}
  </div>

  <div class="container">
    <div class="info-card">
      <h2>Conversation Metadata</h2>
      <p><strong>Chat ID:</strong> <code>${escapeHtml(chatInfo.id)}</code></p>
      <p><strong>Type:</strong> ${chatInfo.isGroup ? 'Group Conversation' : 'Direct 1-on-1'}</p>
      <p><strong>Participants:</strong> ${escapeHtml(chatInfo.participants.join(', '))}</p>
    </div>

    <div class="messages-container">
      ${messageRows}
    </div>

    <div class="footer">
      Generated by WebChat Enterprise Compliance &bull; Compliant with GDPR Right of Access & e-Discovery
    </div>
  </div>
</body>
</html>`;
}
