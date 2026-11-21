"use client";

/** Calls one of the AI routes. Always resolves; `message` is ready to show when something went wrong. */
export async function aiPost<T>(
  url: string,
  body: unknown,
): Promise<{ ok: true; data: T } | { ok: false; message: string }> {
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await r.json().catch(() => ({}))) as T & { message?: string };
    return r.ok ? { ok: true, data } : { ok: false, message: data.message ?? "The AI request didn't work. Try again." };
  } catch {
    return { ok: false, message: "Couldn't reach the server. Check your connection and try again." };
  }
}

export const AI_OFF = "AI features are not switched on for this site yet. Everything else works as normal.";
