export const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
].join(" ");

export function getGoogleAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/email/callback`,
    response_type: "code",
    scope: GMAIL_SCOPES,
    access_type: "offline",
    prompt: "consent",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeCodeForTokens(code: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/email/callback`,
      grant_type: "authorization_code",
    }),
  });
  return res.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

export async function getGmailMessages(accessToken: string, maxResults = 20) {
  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&labelIds=INBOX`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const listData = await listRes.json() as { messages?: Array<{ id: string }> };
  const messages = listData.messages ?? [];

  const emails = await Promise.all(
    messages.slice(0, 20).map(async (msg) => {
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const msgData = await msgRes.json() as GmailMessage;
      return parseGmailMessage(msgData);
    })
  );

  return emails;
}

export async function sendGmailMessage(
  accessToken: string,
  to: string,
  subject: string,
  body: string
) {
  // Ottieni email del mittente
  const profileRes = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/profile",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const profile = await profileRes.json() as { emailAddress: string };

  const raw = btoa(
    `From: ${profile.emailAddress}\r\nTo: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${body}`
  ).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const res = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw }),
    }
  );
  return res.json();
}

interface GmailMessage {
  id: string;
  labelIds: string[];
  snippet: string;
  payload: {
    headers: Array<{ name: string; value: string }>;
    body?: { data?: string };
    parts?: Array<{ mimeType: string; body: { data?: string } }>;
  };
  internalDate: string;
}

function parseGmailMessage(msg: GmailMessage) {
  const headers = msg.payload.headers;
  const getHeader = (name: string) =>
    headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";

  const from = getHeader("From");
  const to = getHeader("To");
  const subject = getHeader("Subject");
  const date = new Date(parseInt(msg.internalDate)).toISOString();

  // Estrai body
  let body = "";
  if (msg.payload.body?.data) {
    body = Buffer.from(msg.payload.body.data, "base64").toString("utf-8");
  } else if (msg.payload.parts) {
    const textPart = msg.payload.parts.find((p) => p.mimeType === "text/plain");
    if (textPart?.body?.data) {
      body = Buffer.from(textPart.body.data, "base64").toString("utf-8");
    }
  }

  return {
    id: msg.id,
    from,
    to,
    subject,
    snippet: msg.snippet,
    body,
    date,
    read: !msg.labelIds.includes("UNREAD"),
  };
}
