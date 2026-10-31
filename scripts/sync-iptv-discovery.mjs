import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";

const API = "https://iptv-org.github.io/api";
const args = process.argv.slice(2);
const outputIndex = args.indexOf("--sql");
const outputPath = outputIndex >= 0 ? args[outputIndex + 1] : "";
if (!outputPath) throw new Error("Usage: node scripts/sync-iptv-discovery.mjs --sql /tmp/iptv-discovery.sql");

async function fetchJson(name) {
  const response = await fetch(`${API}/${name}.json`, {
    headers: { accept: "application/json", "user-agent": "YocareLive-DiscoverySync/1.0" },
    signal: AbortSignal.timeout(45000)
  });
  if (!response.ok) throw new Error(`${name}.json returned HTTP ${response.status}`);
  const value = await response.json();
  if (!Array.isArray(value)) throw new Error(`${name}.json was not an array`);
  return value;
}

function sql(value) {
  if (value === null || value === undefined || value === "") return "NULL";
  return "'" + String(value).replace(/'/g, "''") + "'";
}
function safeCandidate(raw) {
  try {
    const url = new URL(raw);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return null;
    const host = url.hostname.toLowerCase().replace(/\.$/, "");
    if (!host || host === "localhost" || host.endsWith(".localhost") ||
        host.endsWith(".local") || host.endsWith(".internal") ||
        host.includes(":") || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) return null;
    return { url: url.href, host };
  } catch {
    return null;
  }
}
function sourceType(url) {
  const path = new URL(url).pathname.toLowerCase();
  if (/\.m3u8$/.test(path)) return "hls";
  if (/\.mpd$/.test(path)) return "dash";
  if (/\.(mp4|m4v|mp3|aac|ts)$/.test(path)) return "direct";
  return "unknown";
}
function countryCode(channel, countries) {
  const raw = String(channel.country || channel.country_code || "").trim();
  if (/^[a-z]{2}$/i.test(raw)) return raw.toLowerCase();
  const normalized = raw.toLowerCase();
  const match = countries.find(item =>
    String(item.name || "").trim().toLowerCase() === normalized ||
    String(item.native_name || "").trim().toLowerCase() === normalized
  );
  const code = match?.code || match?.alpha2 || match?.iso_3166_1;
  return /^[a-z]{2}$/i.test(String(code || "")) ? String(code).toLowerCase() : "";
}

const [channels, countries, streams] = await Promise.all([
  fetchJson("channels"), fetchJson("countries"), fetchJson("streams")
]);
const channelById = new Map(channels.map(channel => [channel.id, channel]));
const countryByChannel = new Map();
for (const channel of channels) countryByChannel.set(channel.id, countryCode(channel, countries));

const statements = [];
const importedChannels = new Set();
let skipped = 0;
for (const stream of streams) {
  const channel = channelById.get(stream.channel);
  const candidate = safeCandidate(stream.url);
  if (!channel || !candidate || typeof channel.name !== "string" || !channel.name.trim()) {
    skipped += 1;
    continue;
  }
  const cc = countryByChannel.get(channel.id) || "";
  const channelId = cc ? `${channel.id}@${cc}` : null;
  if (channelId && !importedChannels.has(channelId)) {
    statements.push(`INSERT INTO channels (id,name,country_code,enabled) VALUES (${sql(channelId)},${sql(channel.name)},${sql(cc)},1) ON CONFLICT(id) DO UPDATE SET name=excluded.name, updated_at=datetime('now');`);
    importedChannels.add(channelId);
  }
  const referrer = stream.referrer || stream.http_referrer || stream.referer || null;
  const userAgent = stream.user_agent || stream.userAgent || null;
  const key = createHash("sha256").update(`${channel.id}\n${candidate.url}`).digest("hex");
  statements.push(`INSERT INTO discovery_streams (source_key,catalogue_channel_id,channel_id,channel_name,country_code,source_url,source_host,source_type,referrer,user_agent,review_status,first_seen_at,last_seen_at) VALUES (${sql(key)},${sql(channel.id)},${sql(channelId)},${sql(channel.name)},${sql(cc || null)},${sql(candidate.url)},${sql(candidate.host)},${sql(sourceType(candidate.url))},${sql(referrer)},${sql(userAgent)},'discovered',datetime('now'),datetime('now')) ON CONFLICT(source_key) DO UPDATE SET channel_id=excluded.channel_id,channel_name=excluded.channel_name,country_code=excluded.country_code,source_host=excluded.source_host,source_type=excluded.source_type,referrer=excluded.referrer,user_agent=excluded.user_agent,last_seen_at=datetime('now');`);
}

// A complete transaction makes each sync atomic. Discovery rows are never copied into sources.
const chunks = [];
for (let i = 0; i < statements.length; i += 250) {
  chunks.push("BEGIN TRANSACTION;\n" + statements.slice(i, i + 250).join("\n") + "\nCOMMIT;");
}
await writeFile(outputPath, chunks.join("\n"), "utf8");
console.log(JSON.stringify({
  channels: importedChannels.size,
  streams_seen: streams.length,
  discovery_records_upserted: statements.length - importedChannels.size,
  skipped: skipped,
  sql_file: outputPath,
  playback_sources_created: 0
}, null, 2));
