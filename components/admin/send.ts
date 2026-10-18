/** JSON request to an admin route. Returns an error message, or null on success. */
export async function send(method: "POST" | "PATCH" | "DELETE", path: string, body: unknown): Promise<string | null> {
  try {
    const res = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) return null;
    const data = await res.json().catch(() => ({}));
    return data.error ?? "Something went wrong. Please try again.";
  } catch {
    return "Something went wrong. Please try again.";
  }
}
