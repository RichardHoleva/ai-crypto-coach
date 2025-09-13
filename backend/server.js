// backend/server.js
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const axios = require("axios");
const OpenAI = require("openai");

// -------------------------
// Env + app bootstrap
// -------------------------
const envPath = path.join(__dirname, ".env");
dotenv.config({ path: envPath });

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const CRYPTOPANIC_TOKEN = process.env.CRYPTOPANIC_TOKEN;       // optional
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY; // optional

if (!OPENAI_API_KEY) {
  console.warn("⚠️  OPENAI_API_KEY is missing in backend/.env");
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// -------------------------
// Small in-memory cache
// -------------------------
const cache = new Map();
function setCache(key, value, ttlMs) {
  cache.set(key, { value, exp: Date.now() + ttlMs });
}
function getCache(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.exp) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}

// -------------------------
// Helpers: symbol ↔ CoinGecko id
// -------------------------
const COIN_ID_MAP = {
  btc: "bitcoin",
  xbt: "bitcoin",
  bitcoin: "bitcoin",
  eth: "ethereum",
  ethereum: "ethereum",
  sol: "solana",
  solana: "solana",
  usdt: "tether",
  tether: "tether",
  bnb: "binancecoin",
  ada: "cardano",
  doge: "dogecoin",
  dogecoin: "dogecoin",
  xrp: "ripple",
  ripple: "ripple",
};

function normalizeCoin(input) {
  if (!input) return null;
  const clean = String(input).trim().toLowerCase();
  return COIN_ID_MAP[clean] || clean; // let CoinGecko try unknown ids too
}

// -------------------------
// Providers: Market data
// -------------------------
async function fetchMarketFromCoinGecko(id) {
  const cacheKey = `cg:${id}`;
  const hit = getCache(cacheKey);
  if (hit) return hit;

  const url =
    "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=" +
    encodeURIComponent(id) +
    "&price_change_percentage=24h";
  const { data } = await axios.get(url, { timeout: 10_000 });
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(`CoinGecko: no data for ${id}`);
  }
  const c = data[0];
  const out = {
    id: c.id,
    symbol: c.symbol?.toUpperCase(),
    name: c.name,
    price_usd: c.current_price,
    market_cap_usd: c.market_cap,
    volume_24h_usd: c.total_volume,
    change_24h_pct: c.price_change_percentage_24h_in_currency,
    source: "coingecko",
    updated_at: new Date().toISOString(),
  };
  setCache(cacheKey, out, 20_000); // 20s
  return out;
}

async function fetchMarketFromCMC(symbolOrId) {
  if (!COINMARKETCAP_API_KEY) {
    throw new Error("CMC key missing");
  }
  const cacheKey = `cmc:${symbolOrId}`;
  const hit = getCache(cacheKey);
  if (hit) return hit;

  const url =
    "https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest";
  // If user passed "bitcoin", map to BTC for CMC. If they passed BTC already, fine.
  let symbol = symbolOrId.toUpperCase();
  if (symbolOrId.toLowerCase() === "bitcoin") symbol = "BTC";
  if (symbolOrId.toLowerCase() === "ethereum") symbol = "ETH";
  if (symbolOrId.toLowerCase() === "solana") symbol = "SOL";

  const { data } = await axios.get(url, {
    params: { symbol },
    headers: { "X-CMC_PRO_API_KEY": COINMARKETCAP_API_KEY },
    timeout: 10_000,
  });

  const key = Object.keys(data.data || {})[0];
  if (!key) throw new Error("CMC: no data");
  const c = data.data[key];
  const q = c.quote?.USD;
  const out = {
    id: c.slug,
    symbol: c.symbol,
    name: c.name,
    price_usd: q?.price,
    market_cap_usd: q?.market_cap,
    volume_24h_usd: q?.volume_24h,
    change_24h_pct: q?.percent_change_24h,
    source: "coinmarketcap",
    updated_at: new Date().toISOString(),
  };
  setCache(cacheKey, out, 20_000);
  return out;
}

async function getMarketData(input) {
  const id = normalizeCoin(input);
  try {
    return await fetchMarketFromCoinGecko(id);
  } catch (e) {
    // fall back to CMC by symbol if available
    if (COINMARKETCAP_API_KEY) {
      try {
        return await fetchMarketFromCMC(input);
      } catch {}
    }
    throw e;
  }
}

// -------------------------
// Providers: News
// -------------------------
async function fetchNewsFromCryptoPanic(query, limit = 8) {
  if (!CRYPTOPANIC_TOKEN) throw new Error("CryptoPanic token missing");

  const cacheKey = `cp:${query}:${limit}`;
  const hit = getCache(cacheKey);
  if (hit) return hit;

  const { data } = await axios.get("https://cryptopanic.com/api/v1/posts/", {
    params: {
      auth_token: CRYPTOPANIC_TOKEN,
      currencies: query, // accepts symbols like BTC, ETH, SOL
      kind: "news",
      filter: "rising|hot|important",
      public: true,
      page: 1,
    },
    timeout: 10_000,
  });

  const items = (data.results || [])
    .slice(0, limit)
    .map((r) => ({
      title: r.title,
      url: r.url,
      source: r.domain,
      published_at: r.published_at,
      sentiment: r.votes, // contains "negative","positive","important" counts
    }));

  setCache(cacheKey, items, 5 * 60_000); // 5m
  return items;
}

// Very lightweight fallback that pulls some public feeds via a passthrough RSS->JSON endpoint
// (No API key; not guaranteed. Good as a last resort.)
async function fetchNewsFallback(query, limit = 6) {
  const cacheKey = `rss:${query}:${limit}`;
  const hit = getCache(cacheKey);
  if (hit) return hit;

  const feeds = [
    // Coindesk & The Block front pages; we’ll just filter titles containing the query
    "https://rss.app/feeds/_K1jZ3iS8wMyE3sQ6.xml", // Coindesk mirror (example)
    "https://rss.app/feeds/8m3Z5m8XvJx0tqvU.xml", // The Block mirror (example)
  ];

  const results = [];
  await Promise.allSettled(
    feeds.map(async (u) => {
      try {
        const { data } = await axios.get(u, { timeout: 10_000 });
        // rss.app returns JSON; if XML, you'd need to parse; we keep this simple as a fallback
        const items = Array.isArray(data?.items) ? data.items : [];
        for (const it of items) {
          const title = it.title || "";
          if (
            query &&
            !title.toLowerCase().includes(String(query).toLowerCase())
          )
            continue;
          results.push({
            title,
            url: it.url || it.link,
            source: it.site || it.source || "feed",
            published_at: it.published || it.pubDate,
          });
        }
      } catch {}
    })
  );

  const out = results.slice(0, limit);
  setCache(cacheKey, out, 5 * 60_000);
  return out;
}

async function getCryptoNews(queryLike, limit = 8) {
  // Accept "btc" / "bitcoin" / "crypto"
  const q = (queryLike || "crypto").toString().trim();
  try {
    // CryptoPanic supports symbols best
    const sym =
      q.toLowerCase() === "bitcoin" ? "BTC" :
      q.toLowerCase() === "ethereum" ? "ETH" :
      q.toLowerCase() === "solana" ? "SOL" : q.toUpperCase();
    return await fetchNewsFromCryptoPanic(sym, limit);
  } catch {
    return await fetchNewsFallback(q, limit);
  }
}

// -------------------------
// OpenAI tool definitions
// -------------------------
const tools = [
  {
    type: "function",
    function: {
      name: "fetch_market_data",
      description:
        "Get live market data (price, market cap, 24h change, volume) for a cryptocurrency.",
      parameters: {
        type: "object",
        properties: {
          asset: {
            type: "string",
            description:
              "Coin symbol or id, e.g. 'btc', 'bitcoin', 'eth', 'solana'.",
          },
        },
        required: ["asset"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "fetch_crypto_news",
      description:
        "Fetch relevant crypto headlines. Use when the user asks for 'news', 'latest', 'what's happening', etc.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Topic, coin or symbol (e.g., 'btc', 'bitcoin', 'crypto').",
          },
          limit: { type: "number", description: "Max number of stories." },
        },
        required: ["query"],
      },
    },
  },
];

// -------------------------
// Tool router
// -------------------------
async function callTool(toolName, args) {
  switch (toolName) {
    case "fetch_market_data": {
      const { asset } = args;
      const data = await getMarketData(asset);
      return data;
    }
    case "fetch_crypto_news": {
      const { query, limit = 8 } = args;
      const items = await getCryptoNews(query, limit);
      return items;
    }
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

// -------------------------
// Chat endpoint with tool use
// -------------------------
app.post("/api/chat", async (req, res) => {
  try {
    const userMessage = req.body?.message ?? "";
    const history = req.body?.messages ?? []; // if you already pass a full chat history

    const messages = [
      {
        role: "system",
        content:
          "You are a crisp, friendly AI crypto coach. When users ask for live data (prices, market caps, or news), use the tools to look it up and then answer with numbers plus a short explanation.",
      },
      ...history,
      { role: "user", content: userMessage },
    ];

    // 1) ask the model if it wants to call a tool
    let completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      tools,
      tool_choice: "auto",
      temperature: 0.3,
    });

    // 2) If the model requested tools, fulfill them and send a second call
    const tcalls = completion.choices?.[0]?.message?.tool_calls || [];
    const toolResults = [];

    for (const t of tcalls) {
      const name = t.function?.name;
      const rawArgs = t.function?.arguments || "{}";
      let parsed = {};
      try {
        parsed = JSON.parse(rawArgs);
      } catch {}
      const result = await callTool(name, parsed);
      toolResults.push({
        tool_call_id: t.id,
        role: "tool",
        name,
        content: JSON.stringify(result),
      });
    }

    if (toolResults.length > 0) {
      // 3) Send the tool outputs back to the model to get the final answer
      const second = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          ...messages,
          completion.choices[0].message,
          ...toolResults,
        ],
        temperature: 0.3,
      });
      const finalMsg = second.choices?.[0]?.message?.content ?? "";
      return res.json({ reply: finalMsg });
    }

    // No tools needed — just return the model text
    const reply = completion.choices?.[0]?.message?.content ?? "";
    return res.json({ reply });
  } catch (error) {
    console.error("Chat error:", error?.response?.data || error);
    const status = error?.status || 500;
    if (status === 401) {
      return res.status(500).json({ error: "API key authentication failed" });
    } else if (status === 429) {
      return res.status(500).json({ error: "Rate limit exceeded" });
    } else if (status === 400) {
      return res.status(500).json({ error: "Bad request to OpenAI API" });
    } else {
      return res
        .status(500)
        .json({ error: "Something went wrong talking to OpenAI." });
    }
  }
});

// Quick utility routes (optional)
app.get("/api/marketcap", async (req, res) => {
  try {
    const asset = req.query.asset || "btc";
    const data = await getMarketData(asset);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message || "Failed to fetch market cap" });
  }
});

app.get("/api/news", async (req, res) => {
  try {
    const q = req.query.q || "crypto";
    const limit = Number(req.query.limit || 8);
    const items = await getCryptoNews(q, limit);
    res.json({ items });
  } catch (e) {
    res.status(500).json({ error: e.message || "Failed to fetch news" });
  }
});

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    openaiKey: !!OPENAI_API_KEY,
    cryptopanic: !!CRYPTOPANIC_TOKEN,
    cmc: !!COINMARKETCAP_API_KEY,
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(
    `🔑 OPENAI key: ${OPENAI_API_KEY ? "✅" : "❌"}, CryptoPanic: ${
      CRYPTOPANIC_TOKEN ? "✅" : "❌"
    }, CMC: ${COINMARKETCAP_API_KEY ? "✅" : "❌"}`
  );
});
