"use client";

export interface ApiError {
  code?: string;
  message?: string;
}

/** POSTs JSON to one of our auth endpoints and returns the parsed reply. */
export async function postJson<T = Record<string, unknown>>(
  url: string,
  body: unknown,
): Promise<{ ok: boolean; status: number; data: T & ApiError }> {
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (r.status === 204 ? {} : await r.json().catch(() => ({}))) as T & ApiError;
    return { ok: r.ok, status: r.status, data };
  } catch {
    return {
      ok: false,
      status: 0,
      data: { message: "Couldn't reach Afrimetrica. Check your connection and try again." } as T & ApiError,
    };
  }
}
