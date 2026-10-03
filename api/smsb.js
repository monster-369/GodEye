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
    if (GET_CHANNELS[filter]) {
      const url = `${GET_CHANNELS[filter]}&phone=${number}`;
      const r = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36",
          Accept: "application/json",
          Connection: "keep-alive",
        },
        cache: "no-store",
      });
      const text = await r.text();
      res.setHeader("Content-Type", "application/json");
      return res.status(r.status).send(text);
    }

    if (filter === "coro") {
      const payload = { number, mobile: number, phone: number, num: number };
      const r = await fetch(API_CORO, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36",
          Accept: "application/json",
          Origin: "https://coroauto-sms.vercel.app",
          Referer: "https://coroauto-sms.vercel.app/",
          Connection: "keep-alive",
        },
        body: JSON.stringify(payload),
        cache: "no-store",
      });
      const text = await r.text();
      res.setHeader("Content-Type", "application/json");
      return res.status(r.status).send(text);
    }

    return res.status(400).json({ error: "bad filter" });
  } catch (e) {
    return res.status(502).json({ error: String(e.message || e) });
  }
}

        
