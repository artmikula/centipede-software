const SITUATIONS = [
  "I don't have a website yet",
  "My site needs a redesign",
  "I need more leads online",
  "I want AI features on my site",
  "I'm not showing up in search",
  "Not sure where to start",
];

const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 5;
const seen = new Map();

function rateLimited(key) {
  const now = Date.now();
  const recent = (seen.get(key) ?? []).filter((stamp) => now - stamp < WINDOW_MS);
  recent.push(now);
  seen.set(key, recent);
  return recent.length > MAX_REQUESTS;
}

function clean(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function json(body, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export default {
  async fetch(request, env) {
    if (request.method !== "POST") return json({ ok: false, message: "Method not allowed." }, 405);

    const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
    if (rateLimited(ip)) return json({ ok: false, message: "Too many attempts. Please try again in ten minutes." }, 429);

    const payload = await request.json().catch(() => null);
    if (!payload) return json({ ok: false, message: "Please check the highlighted fields." }, 400);

    if (clean(payload.website, 1)) return json({ ok: true });

    const name = clean(payload.from_name, 100);
    const email = clean(payload.from_email, 254);
    const business = clean(payload.business, 150);
    const message = clean(payload.message, 5000);
    const situation = Array.isArray(payload.situation)
      ? payload.situation.filter((item) => SITUATIONS.includes(item))
      : [];

    if (name.length < 2 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return json({ ok: false, message: "Please check the highlighted fields." }, 400);
    }

    const body = [
      `Name: ${name}`,
      `Email: ${email}`,
      `Business: ${business || "Not provided"}`,
      `Situation: ${situation.length ? situation.join(", ") : "Not specified"}`,
      "",
      message || "No message",
    ].join("\n");

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.FORM_FROM_EMAIL,
        to: [env.FORM_TO_EMAIL],
        reply_to: email,
        subject: `centipede.dev inquiry from ${name}`,
        text: body,
      }),
    });

    if (!response.ok) {
      console.error("resend rejected the message", response.status, await response.text().catch(() => ""));
      return json({ ok: false, message: "Something went wrong. Email us directly at contact@centipede.dev" }, 502);
    }

    return json({ ok: true, message: "Request sent. We will be in touch within 24 hours." });
  },
};
