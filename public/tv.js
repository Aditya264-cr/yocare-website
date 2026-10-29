(() => {
  "use strict";

  const PLAYLIST_BASE = "https://iptv-org.github.io/iptv/";
  const REGISTRY_BASE = String(document.querySelector('meta[name="yocare-live-registry-url"]')?.content || "").trim().replace(/\/$/, "");
  const REGISTRY_FETCH_TIMEOUT_MS = 7000;
  const PAGE_SIZE = 48;
  const PLAYLIST_FETCH_TIMEOUT_MS = 15000;
  const DIRECT_STARTUP_TIMEOUT_MS = 25000;
  const STREAM_STARTUP_TIMEOUT_MS = 50000;
  const BUFFER_STALL_TIMEOUT_MS = 30000;
  const $ = (id) => document.getElementById(id);
  const els = {
    video: $("video"), placeholder: $("player-placeholder"), grid: $("channel-grid"),
    country: $("country-select"), search: $("search-input"), count: $("channel-count"),
    loading: $("load-state"), empty: $("empty-state"), more: $("load-more"),
    title: $("now-title"), subtitle: $("now-subtitle"), region: $("player-region"),
    state: $("playback-state"), message: $("player-message"), retry: $("retry-button"), playStart: $("play-start"),
    clear: $("clear-search"), categories: $("category-chips"),
    categorySummary: $("category-summary"), visibleSummary: $("visible-summary"), featured: $("featured-channels"), featuredLoading: $("featured-loading"), genreRails: $("genre-rails"), spotlightPlay: $("spotlight-play"), spotlightCard: $("spotlight-card"), spotlightLogo: $("spotlight-logo"), spotlightName: $("spotlight-name"), spotlightDetail: $("spotlight-detail"), spotlightRegion: $("spotlight-region"), homeRegion: $("home-region"), searchAction: $("search-action"),
    homeTitle: $("home-title"), heroCopy: $("hero-copy"), topPicks: $("top-picks-rail"), topPicksLoading: $("top-picks-loading"),
    spotlightBackdrop: $("spotlight-backdrop"), spotlightStatus: $("spotlight-status"), spotlightLabel: $("spotlight-label"),
    spotlightControls: $("spotlight-controls"), spotlightPrev: $("spotlight-prev"), spotlightNext: $("spotlight-next"), spotlightPosition: $("spotlight-position"),
    programSection: $("on-now"), programRail: $("program-rail"), programEmpty: $("program-empty"), guideStatus: $("guide-status")
  };

  let channels = [];
  let filtered = [];
  let page = 0;
  let activeFilter = "all";
  let activeChannel = null;
  let spotlightChannel = null;
  let fallbackIndex = 0;
  let sourceAttemptId = 0;
  let lastSourceFailure = null;
  let hls = null;
  let dashPlayer = null;
  let loadController = null;
  let requestNumber = 0;
  let playbackTimer = 0;
  let isLoadingPlaylist = false;
  let alternatePlaylistPending = false;
  let waitingForAlternateSource = null;
  let networkRecoveryAttempts = 0;
  let mediaRecoveryAttempts = 0;
  const registryRefreshAttempted = new WeakSet();
  const registryRefreshes = new WeakMap();
  let programGuide = {channels:{}};
  let programEntries = [];
  let carouselIndex = 0;

  const countryName = () => els.country.options[els.country.selectedIndex]?.textContent.trim() || "Selected country";
  const normalise = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\b(uhd|fhd|hd|sd|4k|1080p|720p|576p|480p|360p)\b/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  const categoryFor = (name, group) => {
    const source = (group + " " + name).toLowerCase();
    if (/news|headline|breaking|business|finance|weather|politic/.test(source)) return "news";
    if (/music|radio|song|hits|mtv|vevo|concert/.test(source)) return "music";
    if (/spiritual|relig|bhajan|devotional|faith|worship|church|temple|islam|quran|christ|gospel|aastha/.test(source)) return "religion";
    if (/sport|cricket|football|soccer|tennis|basketball/.test(source)) return "sports";
    if (/kids|child|cartoon|animation/.test(source)) return "kids";
    if (/movie|cinema|film|drama|entertainment/.test(source)) return "entertainment";
    return "general";
  };
  const initialsFor = (name) => {
    const cleaned = name.replace(/\([^)]*\)/g, "").replace(/\b(HD|FHD|UHD|4K|TV)\b/gi, "").trim();
    const words = cleaned.split(/\s+/).filter(Boolean);
    return words.length > 1
      ? words.slice(0, 2).map(word => word[0]).join("").toUpperCase()
      : (words[0] || "TV").slice(0, 2).toUpperCase();
  };
  const CATEGORY_LABELS = {
    all: "All channels", news: "News", sports: "Sports", entertainment: "Entertainment",
    music: "Music", kids: "Kids & family", religion: "Spiritual", general: "General"
  };
  const CATEGORY_ORDER = ["all", "news", "sports", "entertainment", "music", "kids", "religion", "general"];
  const categoryLabel = (category) => CATEGORY_LABELS[category] || "General";
  const safeText = (value) => String(value || "").replace(/[<>]/g, "");
  const safeImageUrl = (value) => {
    try {
      const url = new URL(String(value || ""), document.baseURI);
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch (_) {
      return "";
    }
  };
  const guideChannels = () => programGuide && programGuide.channels && typeof programGuide.channels === "object" ? programGuide.channels : {};
  const guideProgramsFor = (channel) => {
    if (!channel || !channel.idKey) return [];
    const id = String(channel.idKey).toLowerCase();
    const key = Object.keys(guideChannels()).find(candidate => candidate.toLowerCase() === id);
    if (!key) return [];
    const entry = guideChannels()[key];
    return Array.isArray(entry) ? entry : (entry && Array.isArray(entry.programs) ? entry.programs : []);
  };
  const formatClock = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString([], {hour:"numeric", minute:"2-digit"});
  };
  const formatProgramTime = (program) => formatClock(program.start) + " – " + formatClock(program.end);

  function parsePlaylist(text) {
    const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
    const parsed = [];
    let pending = null;
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;
      if (line.startsWith("#EXTINF:")) {
        const comma = line.indexOf(",");
        const meta = comma >= 0 ? line.slice(0, comma) : line;
        const name = comma >= 0 ? line.slice(comma + 1).trim() : "Live channel";
        const getAttr = (key) => {
          const match = meta.match(new RegExp("(?:^|\\s)" + key + '="([^"]*)"', "i"));
          return match ? match[1] : "";
        };
        pending = {
          name: name || "Live channel",
          group: getAttr("group-title"),
          logo: getAttr("tvg-logo"),
          id: getAttr("tvg-id"),
          url: ""
        };
      } else if (line.startsWith("#") || !pending) {
        continue;
      } else if (/^(https?|rtmps?|rtsp|udp|rtp|mms|mmsh):\/\//i.test(line)) {
        try {
          const url = new URL(line);
          if (["http:", "https:", "rtmp:", "rtmps:", "rtsp:", "udp:", "rtp:", "mms:", "mmsh:"].includes(url.protocol)) {
            pending.url = url.href;
            pending.key = normalise(pending.name);
            pending.category = categoryFor(pending.name, pending.group);
            pending.idKey = pending.id || pending.key;
            parsed.push(pending);
          }
        } catch (_) {}
        pending = null;
      }
    }

    // Keep alternate public endpoints for the same channel so playback can fail over.
    const grouped = new Map();
    for (const item of parsed) {
      if (!item.key || !item.url) continue;
      if (!grouped.has(item.key)) grouped.set(item.key, {...item, urls: []});
      const channel = grouped.get(item.key);
      if (!channel.urls.includes(item.url)) channel.urls.push(item.url);
      if (!channel.logo && item.logo) channel.logo = item.logo;
      if (!channel.group && item.group) channel.group = item.group;
    }
    return [...grouped.values()].map((channel, index) => ({
      ...channel,
      id: channel.idKey + "-" + index,
      category: categoryFor(channel.name, channel.group),
      url: channel.urls[0]
    })).sort((a, b) => a.name.localeCompare(b.name));
  }

  function setLoading(isLoading, message = "Loading the channel guide…") {
    els.loading.hidden = !isLoading;
    els.loading.querySelector("span:last-child").textContent = message;
    isLoadingPlaylist = isLoading;
  }

  function setMessage(message) {
    els.message.textContent = message;
    els.message.hidden = !message;
  }

  function setPlaybackState(message) {
    els.state.textContent = message;
  }

  function isCurrentSource(channel, index, attemptId) {
    return activeChannel === channel && fallbackIndex === index && sourceAttemptId === attemptId;
  }

  function sourceFailureMessage(category) {
    const messages = {
      invalid: "a source URL was malformed",
      protocol: "a source used a protocol this browser cannot play",
      player: "the required browser playback library did not load",
      unsupported: "this browser could not play the source format",
      denied: "the provider denied browser access",
      missing: "the provider reported that the stream was missing",
      decode: "the browser could not decode the stream",
      network: "the source did not deliver playable media",
      timeout: "the source did not become playable before the startup limit",
      stalled: "the stream stopped delivering media"
    };
    return messages[category] || "the source could not be started";
  }

  function recordSourceFailure(channel, index, category, status) {
    lastSourceFailure = category;
    const details = {channel: channel.name, source: index + 1, category};
    if (status) details.status = status;
    console.warn("Yocare Live source failed", details);
  }


  function canonicalRegistryId(channel) {
    const candidate = String(channel && (channel.idKey || channel.id || channel.key) || "").trim();
    return /^[a-zA-Z0-9][a-zA-Z0-9._:@-]{0,119}$/.test(candidate) ? candidate : "";
  }

  function refreshRegistrySources(channel) {
    if (!REGISTRY_BASE || !channel || registryRefreshAttempted.has(channel)) return Promise.resolve(false);
    const existing = registryRefreshes.get(channel);
    if (existing) return existing;
    const channelId = canonicalRegistryId(channel);
    if (!channelId) return Promise.resolve(false);
    registryRefreshAttempted.add(channel);
    const pending = (async () => {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), REGISTRY_FETCH_TIMEOUT_MS);
      try {
        const response = await fetch(REGISTRY_BASE + "/api/channels/" + encodeURIComponent(channelId) + "/sources", {
          method: "GET",
          headers: { "accept": "application/json" },
          signal: controller.signal,
          cache: "no-store"
        });
        if (!response.ok) return false;
        const payload = await response.json();
        if (!payload || !Array.isArray(payload.sources)) return false;
        channel.registrySourceIds = channel.registrySourceIds || Object.create(null);
        let added = false;
        for (const source of payload.sources) {
          if (!source || typeof source.id !== "string" || typeof source.url !== "string") continue;
          let parsed;
          try { parsed = new URL(source.url); } catch (_) { continue; }
          if (!["https:", "http:"].includes(parsed.protocol) || parsed.username || parsed.password) continue;
          const playbackUrl = parsed.href;
          if (!channel.urls.includes(playbackUrl)) {
            channel.urls.push(playbackUrl);
            added = true;
          }
          channel.registrySourceIds[playbackUrl] = source.id;
        }
        if (added) {
          console.info("Yocare Live registry added approved fallback sources", {channel:channel.name, count:channel.urls.length});
          renderFeaturedChannels();
          applyFilters();
          updateSelectedCard();
        }
        return added;
      } catch (error) {
        if (error && error.name !== "AbortError") console.warn("Yocare Live source registry unavailable:", error);
        return false;
      } finally {
        window.clearTimeout(timeout);
      }
    })();
    registryRefreshes.set(channel, pending);
    return pending;
  }

  function reportRegistryFailure(channel, url, reason) {
    if (!REGISTRY_BASE || !channel || !channel.registrySourceIds || !channel.registrySourceIds[url]) return;
    const channelId = canonicalRegistryId(channel);
    if (!channelId) return;
    fetch(REGISTRY_BASE + "/api/report", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({channel_id:channelId, source_id:channel.registrySourceIds[url], reason}),
      keepalive: true
    }).catch(() => {});
  }

  function showPlayPrompt(channel, index, attemptId) {
    if (!isCurrentSource(channel, index, attemptId)) return;
    window.clearTimeout(playbackTimer);
    setPlaybackState("Waiting for your tap");
    setMessage("Your browser blocked automatic playback. Select Play to start this channel.");
    els.playStart.hidden = false;
    els.playStart.disabled = false;
  }

  function handlePlaybackRejection(channel, index, attemptId, error) {
    if (!isCurrentSource(channel, index, attemptId)) return;
    if (error && error.name === "NotAllowedError") {
      showPlayPrompt(channel, index, attemptId);
      return;
    }
    if (error && error.name === "AbortError") {
      els.playStart.disabled = false;
      return;
    }
    const category = error && error.name === "NotSupportedError" ? "unsupported" :
      error && error.name === "SecurityError" ? "denied" : "network";
    recordSourceFailure(channel, index, category);
    tryNextSource(channel, index, attemptId);
  }

  function requestPlayback(channel, index, attemptId) {
    if (!isCurrentSource(channel, index, attemptId)) return;
    try {
      const playback = els.video.play();
      if (!playback || typeof playback.then !== "function") return;
      playback.then(() => {
        if (!isCurrentSource(channel, index, attemptId)) return;
        els.playStart.hidden = true;
        els.playStart.disabled = false;
        setMessage("");
      }).catch(error => handlePlaybackRejection(channel, index, attemptId, error));
    } catch (error) {
      handlePlaybackRejection(channel, index, attemptId, error);
    }
  }

  function resumePendingAlternateFallback() {
    const waiting = waitingForAlternateSource;
    waitingForAlternateSource = null;
    if (waiting && isCurrentSource(waiting.channel, waiting.index, waiting.attemptId)) {
      tryNextSource(waiting.channel, waiting.index, waiting.attemptId);
    }
  }

  function destroyPlayer() {
    const attemptId = ++sourceAttemptId;
    window.clearTimeout(playbackTimer);
    els.video.oncanplay = null;
    els.video.onplaying = null;
    els.video.onwaiting = null;
    els.video.onstalled = null;
    els.video.onerror = null;
    els.playStart.hidden = true;
    els.playStart.disabled = false;
    if (hls) {
      try { hls.destroy(); } catch (_) {}
      hls = null;
    }
    if (dashPlayer) {
      try { dashPlayer.reset(); } catch (_) {}
      dashPlayer = null;
    }
    els.video.pause();
    els.video.removeAttribute("src");
    els.video.load();
    return attemptId;
  }

  function playlistUrl(code) {
    return PLAYLIST_BASE + encodeURIComponent(code) + ".m3u";
  }

  async function fetchPlaylistText(code, signal, kind = "public") {
    const encoded = encodeURIComponent(code);
    const sources = kind === "public"
      ? [
          PLAYLIST_BASE + "countries/" + encoded + ".m3u",
          "https://raw.githubusercontent.com/iptv-org/iptv/gh-pages/countries/" + encoded + ".m3u"
        ]
      : [
          PLAYLIST_BASE + "streams/" + encoded + ".m3u",
          "https://raw.githubusercontent.com/iptv-org/iptv/master/streams/" + encoded + ".m3u"
        ];
    let lastError = null;
    for (const source of sources) {
      const requestController = new AbortController();
      let timedOut = false;
      const abortFromOwner = () => requestController.abort();
      if (signal) {
        if (signal.aborted) requestController.abort();
        else signal.addEventListener("abort", abortFromOwner, {once:true});
      }
      const timeoutId = window.setTimeout(() => {
        timedOut = true;
        requestController.abort();
      }, PLAYLIST_FETCH_TIMEOUT_MS);
      try {
        const response = await fetch(source, {
          signal: requestController.signal,
          cache: "no-cache",
          headers: {"Accept": "application/vnd.apple.mpegurl, audio/x-mpegurl, text/plain, */*"}
        });
        if (!response.ok) throw new Error("Playlist source returned HTTP " + response.status + ".");
        const playlist = await response.text();
        if (!playlist.includes("#EXTINF:")) throw new Error("Playlist source returned no channel entries.");
        return playlist;
      } catch (error) {
        if (signal && signal.aborted) throw error;
        if (timedOut) {
          lastError = new Error("Playlist request timed out.");
          continue;
        }
        if (error && error.name === "AbortError") throw error;
        lastError = error;
      } finally {
        window.clearTimeout(timeoutId);
        if (signal) signal.removeEventListener("abort", abortFromOwner);
      }
    }
    throw lastError || new Error("All " + kind + " playlist sources were unavailable.");
  }


  async function loadProgramGuide(signal, expectedRequest) {
    try {
      const response = await fetch(new URL("data/guide.json", document.baseURI), {
        signal,
        cache: "no-cache",
        headers: {"Accept":"application/json"}
      });
      if (!response.ok) throw new Error("Program guide returned HTTP " + response.status + ".");
      const data = await response.json();
      if (!data || !data.channels || typeof data.channels !== "object" || Array.isArray(data.channels)) {
        throw new Error("Program guide has an invalid format.");
      }
      if (expectedRequest !== requestNumber) return;
      programGuide = data;
    } catch (error) {
      if (signal && signal.aborted || expectedRequest !== requestNumber) return;
      programGuide = {channels:{}};
      console.info("Yocare Live program schedule is not configured:", error.message || error);
    }
    if (expectedRequest === requestNumber) renderProgramGuide();
  }

  function collectProgramEntries() {
    const now = Date.now();
    const horizon = now + 12 * 60 * 60 * 1000;
    const entries = [];
    channels.forEach(channel => {
      guideProgramsFor(channel).forEach(program => {
        const start = Date.parse(program.start);
        const end = Date.parse(program.end);
        const title = safeText(program.title).trim();
        if (!title || !Number.isFinite(start) || !Number.isFinite(end) || end <= start || end <= now || start > horizon) return;
        entries.push({
          channel,
          title,
          description: safeText(program.description),
          image: safeImageUrl(program.image || program.icon),
          start,
          end,
          isCurrent: start <= now && now < end
        });
      });
    });
    return entries.sort((a, b) => {
      if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1;
      return a.start - b.start || a.channel.name.localeCompare(b.channel.name);
    });
  }

  function updateGuideStatus() {
    const updated = programGuide && programGuide.updatedAt ? Date.parse(programGuide.updatedAt) : NaN;
    if (Number.isFinite(updated)) {
      els.guideStatus.textContent = "Program guide updated " + new Date(updated).toLocaleString([], {dateStyle:"medium", timeStyle:"short"}) + " · broadcast times may vary";
    } else if (Object.keys(guideChannels()).length) {
      els.guideStatus.textContent = "Schedules from the connected guide · broadcast times may vary";
    } else {
      els.guideStatus.textContent = "Show schedules are not connected for this region yet.";
    }
  }

  function makeProgramCard(item, index) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "program-card";
    button.dataset.programKey = item.channel.id + "-" + item.start;
    button.style.animationDelay = Math.min(index, 8) * 25 + "ms";
    button.setAttribute("aria-label", (item.isCurrent ? "Watch now: " : "Watch next: ") + item.title + " on " + item.channel.name);

    const art = document.createElement("span");
    art.className = "program-art";
    const fallback = document.createElement("span");
    fallback.className = "program-art-fallback";
    fallback.textContent = "YL";
    fallback.setAttribute("aria-hidden", "true");
    art.append(fallback);
    const imageUrl = item.image || safeImageUrl(item.channel.logo);
    if (imageUrl) {
      const image = document.createElement("img");
      image.loading = "lazy";
      image.alt = "";
      image.referrerPolicy = "no-referrer";
      image.src = imageUrl;
      if (!item.image) art.classList.add("is-channel-logo");
      image.addEventListener("load", () => { fallback.hidden = true; }, {once:true});
      image.addEventListener("error", () => image.remove(), {once:true});
      art.append(image);
    }
    const liveLabel = document.createElement("span");
    liveLabel.className = "program-live-label";
    liveLabel.textContent = item.isCurrent ? "ON NOW" : "UP NEXT";
    art.append(liveLabel);

    const copy = document.createElement("span");
    copy.className = "program-copy";
    const title = document.createElement("span");
    title.className = "program-title";
    title.textContent = item.title;
    const channel = document.createElement("span");
    channel.className = "program-channel";
    channel.textContent = item.channel.name;
    const time = document.createElement("span");
    time.className = "program-time";
    time.textContent = formatProgramTime(item);
    copy.append(title, channel, time);
    if (item.isCurrent) {
      const progress = document.createElement("span");
      progress.className = "program-progress";
      progress.setAttribute("aria-hidden", "true");
      const fill = document.createElement("span");
      fill.style.width = Math.max(2, Math.min(100, ((Date.now() - item.start) / (item.end - item.start)) * 100)) + "%";
      progress.append(fill);
      copy.append(progress);
    }
    button.append(art, copy);
    button.addEventListener("click", () => playChannel(item.channel));
    return button;
  }

  function renderProgramGuide() {
    if (!els.programRail || !els.programEmpty || !els.guideStatus) return;
    const focusedKey = els.programRail.contains(document.activeElement) ? document.activeElement.dataset.programKey : "";
    programEntries = collectProgramEntries();
    const current = programEntries.filter(item => item.isCurrent);
    const upcoming = programEntries.filter(item => !item.isCurrent);
    const visible = (current.length ? current : upcoming).slice(0, 16);
    updateGuideStatus();
    els.programRail.replaceChildren();
    visible.forEach((item, index) => els.programRail.append(makeProgramCard(item, index)));
    els.programRail.hidden = visible.length === 0;
    els.programSection.hidden = visible.length === 0;
    els.programEmpty.hidden = visible.length > 0;
    if (!visible.length) {
      const configured = Object.keys(guideChannels()).length > 0;
      els.programEmpty.querySelector("strong").textContent = configured ? "No matching on-air listings yet." : "Show schedules aren’t connected yet.";
      els.programEmpty.querySelector("p").textContent = configured
        ? "The guide has no current listings matched to channels in this region."
        : "Connect a program guide to see real on-air times and show artwork here.";
    }
    if (current.length) {
      $("program-title").innerHTML = 'On now, <em>around the world.</em>';
    } else if (upcoming.length) {
      $("program-title").innerHTML = 'Coming up <em>next.</em>';
    } else {
      $("program-title").innerHTML = 'On now, <em>around the world.</em>';
    }
    if (focusedKey) {
      const replacement = [...els.programRail.querySelectorAll(".program-card")].find(card => card.dataset.programKey === focusedKey);
      if (replacement) replacement.focus({preventScroll:true});
    }
    carouselIndex = programEntries.length ? carouselIndex % programEntries.length : 0;
    if (!activeChannel) renderSpotlight(null);
  }

  function mergePlaylistSources(primary, alternatives) {
    const merged = [];
    const byName = new Map();
    const byId = new Map();
    const add = (channel) => {
      const nameKey = channel.key || normalise(channel.name);
      const idKey = (channel.idKey || "").toLowerCase();
      const current = (idKey && byId.get(idKey)) || (nameKey && byName.get(nameKey));
      if (!current) {
        const entry = {...channel, urls: [...(channel.urls || [channel.url]).filter(Boolean)]};
        merged.push(entry);
        if (nameKey) byName.set(nameKey, entry);
        if (idKey) byId.set(idKey, entry);
        return;
      }
      const incomingUrls = channel.urls || [channel.url];
      for (const url of incomingUrls) {
        if (url && !current.urls.includes(url)) current.urls.push(url);
      }
      // Public playlist entries are added first, so their logo and preferred URL win.
      if (!current.logo && channel.logo) current.logo = channel.logo;
      if (!current.group && channel.group) current.group = channel.group;
      if (!current.id && channel.id) current.id = channel.id;
      if (!current.idKey && channel.idKey) current.idKey = channel.idKey;
      if (nameKey) byName.set(nameKey, current);
      if (idKey) byId.set(idKey, current);
    };
    primary.forEach(add);
    alternatives.forEach(add);
    return merged.map((channel, index) => ({
      ...channel,
      id: (channel.idKey || channel.key || "channel") + "-" + index,
      category: categoryFor(channel.name, channel.group),
      url: channel.urls[0]
    })).sort((a, b) => a.name.localeCompare(b.name));
  }

  async function loadCountry(code) {
    if (loadController) loadController.abort();
    alternatePlaylistPending = false;
    waitingForAlternateSource = null;
    lastSourceFailure = null;
    loadController = new AbortController();
    const currentRequest = ++requestNumber;
    setLoading(true, "Loading channels for " + countryName() + "…");
    els.grid.replaceChildren();
    els.empty.hidden = true;
    els.more.hidden = true;
    channels = [];
    filtered = [];
    if (els.featured) els.featured.replaceChildren();
    if (els.topPicks) els.topPicks.replaceChildren();
    if (els.topPicksLoading) { els.topPicksLoading.hidden = false; }
    if (els.genreRails) els.genreRails.replaceChildren();
    if (els.programRail) els.programRail.replaceChildren();
    if (els.programSection) els.programSection.hidden = true;
    programGuide = {channels:{}};
    programEntries = [];
    carouselIndex = 0;
    if (els.programRail) els.programRail.hidden = true;
    if (els.programEmpty) els.programEmpty.hidden = false;
    if (els.guideStatus) els.guideStatus.textContent = "Checking the program guide…";
    renderSpotlight(null);
    if (els.featuredLoading) { els.featuredLoading.hidden = false; els.featuredLoading.textContent = "Finding channels in your region…"; }
    els.count.textContent = "—";
    els.region.textContent = countryName().toUpperCase() + " · LIVE TV";
    if (els.homeRegion) els.homeRegion.textContent = countryName().toUpperCase();
    if (els.spotlightRegion) els.spotlightRegion.textContent = countryName().toUpperCase();
    try {
      // Load the public viewer playlist first so the guide can render without waiting
      // for the much larger internal alternatives playlist.
      let publicText = "";
      try {
        publicText = await fetchPlaylistText(code, loadController.signal, "public");
      } catch (publicError) {
        if (publicError.name === "AbortError") throw publicError;
        console.warn("Yocare Live public playlist unavailable; trying internal streams:", publicError);
      }
      if (currentRequest !== requestNumber) return;

      if (publicText) {
        channels = parsePlaylist(publicText);
        if (!channels.length) throw new Error("The public playlist did not contain readable channel entries.");
        renderFeaturedChannels();
        renderCategories();
        applyFilters();
        setLoading(false);
        loadProgramGuide(loadController.signal, currentRequest);

        // Fetch alternate URLs after the first channels are already visible.
        // Hold a failed playback result until this fallback list has had a chance to arrive.
        alternatePlaylistPending = true;
        fetchPlaylistText(code, loadController.signal, "streams").then(streamsText => {
          if (currentRequest !== requestNumber) return;
          const alternatives = parsePlaylist(streamsText);
          alternatePlaylistPending = false;
          if (!alternatives.length) {
            resumePendingAlternateFallback();
            return;
          }
          const previousActive = activeChannel;
          const merged = mergePlaylistSources(channels, alternatives);
          channels = merged;
          renderProgramGuide();
          if (previousActive) {
            const updatedActive = channels.find(channel =>
              (previousActive.idKey && channel.idKey === previousActive.idKey) ||
              (previousActive.key && channel.key === previousActive.key)
            );
            if (updatedActive) {
              previousActive.urls = updatedActive.urls;
              previousActive.id = updatedActive.id;
            }
          }
          renderFeaturedChannels();
          renderCategories();
          applyFilters();
          updateSelectedCard();
          resumePendingAlternateFallback();
        }).catch(error => {
          if (currentRequest === requestNumber) {
            alternatePlaylistPending = false;
            if (error.name !== "AbortError") {
              console.warn("Yocare Live alternate stream list unavailable:", error);
            }
            resumePendingAlternateFallback();
          }
        });
        return;
      }

      // If the public playlist fails, use the internal list as a recovery path.
      const streamsText = await fetchPlaylistText(code, loadController.signal, "streams");
      if (currentRequest !== requestNumber) return;
      channels = parsePlaylist(streamsText);
      if (!channels.length) throw new Error("The playlists did not contain readable channel entries.");
      renderFeaturedChannels();
      renderCategories();
      applyFilters();
      setLoading(false);
      loadProgramGuide(loadController.signal, currentRequest);
    } catch (error) {
      if (error.name === "AbortError" || currentRequest !== requestNumber) return;
      setLoading(false);
      if (els.featuredLoading) { els.featuredLoading.hidden = false; els.featuredLoading.textContent = "Channel picks will appear when the guide is available."; }
      if (els.topPicksLoading) { els.topPicksLoading.hidden = false; els.topPicksLoading.textContent = "Live channel picks are unavailable right now."; }
      els.grid.replaceChildren();
      els.empty.hidden = false;
      els.empty.querySelector("h3").textContent = "Channel guide unavailable";
      els.empty.querySelector("p").textContent = "We couldn’t load this country’s channel list. Check your connection, then retry. (" + (error.message || "Network error") + ")";
      els.clear.textContent = "Retry channel guide";
      els.spotlightName.textContent = "Channel guide unavailable";
      els.spotlightDetail.textContent = "Retry the guide to find available channels";
      els.count.textContent = "0";
      console.warn("Yocare Live playlist load failed:", error);
    }
  }

  function applyFilters() {
    const query = normalise(els.search.value);
    filtered = channels.filter(channel => {
      const matchesQuery = !query || normalise(channel.name + " " + channel.group + " " + channel.id).includes(query);
      const matchesCategory = activeFilter === "all" || channel.category === activeFilter;
      return matchesQuery && matchesCategory;
    });
    page = 0;
    els.grid.replaceChildren();
    els.count.textContent = String(filtered.length);
    if (els.visibleSummary) {
      els.visibleSummary.textContent = activeFilter === "all"
        ? filtered.length + " of " + channels.length + " channels shown"
        : filtered.length + " " + categoryLabel(activeFilter).toLowerCase() + " channels";
    }
    if (els.categorySummary) {
      els.categorySummary.textContent = activeFilter === "all" ? "Every available genre" : categoryLabel(activeFilter);
    }
    els.empty.hidden = filtered.length > 0 || isLoadingPlaylist;
    if (filtered.length === 0 && !isLoadingPlaylist) {
      els.empty.querySelector("h3").textContent = "No channels found";
      els.empty.querySelector("p").textContent = "Try a different search or select another country.";
      els.clear.textContent = "Clear search";
    }
    renderNextPage();
  }

  function makeCard(channel, index) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "channel-card";
    button.style.animationDelay = Math.min(index % PAGE_SIZE, 12) * 16 + "ms";
    button.dataset.channelId = channel.id;
    button.setAttribute("aria-label", "Play " + channel.name);
    button.setAttribute("aria-current", activeChannel && activeChannel.key === channel.key ? "true" : "false");

    const logo = document.createElement("span");
    logo.className = "channel-logo logo-" + channel.category;
    const fallback = document.createElement("span");
    fallback.className = "logo-fallback";
    fallback.textContent = initialsFor(channel.name);
    logo.append(fallback);
    if (channel.logo && /^https?:\/\//i.test(channel.logo)) {
      const image = document.createElement("img");
      image.loading = "lazy";
      image.alt = safeText(channel.name) + " logo";
      image.referrerPolicy = "no-referrer";
      image.src = channel.logo;
      image.addEventListener("load", () => logo.classList.add("has-logo"), {once:true});
      image.addEventListener("error", () => image.remove(), {once:true});
      logo.append(image);
    }

    const info = document.createElement("span");
    info.className = "channel-info";
    const name = document.createElement("span");
    name.className = "channel-name";
    name.textContent = safeText(channel.name);
    name.title = channel.name;
    const meta = document.createElement("span");
    meta.className = "channel-meta";
    const tag = document.createElement("span");
    tag.className = "channel-tag";
    tag.textContent = categoryLabel(channel.category);
    meta.append(tag);
    const sourceCount = document.createElement("span");
    sourceCount.textContent = channel.urls.length > 1 ? channel.urls.length + " sources" : "Live stream";
    meta.append(sourceCount);
    info.append(name, meta);

    const play = document.createElement("span");
    play.className = "channel-play";
    play.setAttribute("aria-hidden", "true");
    play.textContent = activeChannel && activeChannel.key === channel.key ? "●" : "▶";
    button.append(logo, info, play);
    button.addEventListener("click", () => playChannel(channel));
    return button;
  }

  function spotlightSlides() {
    if (programEntries.length) {
      return programEntries.map(entry => ({channel:entry.channel, program:entry}));
    }
    const withLogos = channels.filter(channel => channel.logo);
    const picks = (withLogos.length >= 4 ? withLogos : channels).slice(0, 10);
    return picks.map(channel => ({channel, program:null}));
  }

  function setHeroTitle(value) {
    const words = String(value || "Live TV").trim().split(/\s+/).filter(Boolean);
    const splitAt = words.length > 1 ? Math.ceil(words.length / 2) : words.length;
    const first = words.slice(0, splitAt).join(" ");
    const second = words.slice(splitAt).join(" ");
    const emphasis = document.createElement("em");
    emphasis.textContent = second;
    const children = [document.createTextNode(first)];
    if (second) children.push(document.createElement("br"), emphasis);
    els.homeTitle.replaceChildren(...children);
  }

  function renderSpotlight(channel) {
    const slides = spotlightSlides();
    const selected = channel
      ? {channel, program:programEntries.find(entry => entry.channel.key === channel.key && entry.isCurrent) || null}
      : (slides[carouselIndex] || null);
    const item = selected && selected.program;
    const candidate = channel || (selected && selected.channel) || activeChannel || channels.find(entry => entry.logo) || channels[0] || null;
    spotlightChannel = candidate;
    if (els.spotlightPlay) els.spotlightPlay.disabled = !candidate;
    if (els.spotlightCard) {
      els.spotlightCard.disabled = !candidate;
      els.spotlightCard.setAttribute("aria-label", candidate
        ? (item ? "Watch " + item.title + " on " + candidate.name : "Watch " + candidate.name + " live")
        : "No live channel is available");
    }
    els.spotlightControls.hidden = slides.length < 2;
    els.spotlightPosition.textContent = slides.length ? (carouselIndex + 1) + " / " + slides.length : "1 / 1";
    els.spotlightStatus.textContent = item ? (item.isCurrent ? "ON NOW" : "UP NEXT") : "LIVE CHANNEL";
    els.spotlightLabel.textContent = item ? (item.isCurrent ? "NOW SHOWING" : "COMING UP") : "FEATURED CHANNEL";
    els.spotlightBackdrop.hidden = true;
    els.spotlightBackdrop.onerror = null;
    els.spotlightBackdrop.removeAttribute("src");
    $("discover").classList.remove("has-program-art", "has-channel-art");
    if (!candidate) {
      els.spotlightName.textContent = channels.length ? "Choose a live channel" : "Finding channels…";
      els.spotlightDetail.textContent = channels.length ? "Browse the channel rows below" : "Loading the channel guide";
      els.heroCopy.textContent = "Discover channels from your region and tune in with one click.";
      return;
    }

    const title = item ? item.title : candidate.name;
    setHeroTitle(title);
    els.spotlightName.textContent = title;
    els.spotlightDetail.textContent = item
      ? candidate.name + " · " + formatProgramTime(item)
      : [categoryLabel(candidate.category), countryName(), "Available to watch live"].filter(Boolean).join(" · ");
    els.heroCopy.textContent = item
      ? (item.description || (candidate.name + " · " + formatProgramTime(item) + " · " + countryName()))
      : ("Tune in to " + candidate.name + " live from " + countryName() + ".");
    els.spotlightLogo.replaceChildren();
    els.spotlightLogo.classList.remove("has-logo");
    const fallback = document.createElement("span");
    fallback.className = "spotlight-fallback";
    fallback.textContent = initialsFor(candidate.name);
    els.spotlightLogo.append(fallback);

    const programImage = item && item.image;
    const imageUrl = programImage || safeImageUrl(candidate.logo);
    if (imageUrl) {
      els.spotlightBackdrop.src = imageUrl;
      els.spotlightBackdrop.hidden = false;
      $("discover").classList.add(programImage ? "has-program-art" : "has-channel-art");
      els.spotlightBackdrop.onerror = () => {
        if (els.spotlightBackdrop.src !== imageUrl) return;
        els.spotlightBackdrop.hidden = true;
        $("discover").classList.remove("has-program-art", "has-channel-art");
      };
    }
    if (candidate.logo && safeImageUrl(candidate.logo)) {
      const image = document.createElement("img");
      image.alt = "";
      image.setAttribute("aria-hidden", "true");
      image.loading = "lazy";
      image.referrerPolicy = "no-referrer";
      image.src = safeImageUrl(candidate.logo);
      image.addEventListener("load", () => els.spotlightLogo.classList.add("has-logo"), {once:true});
      image.addEventListener("error", () => image.remove(), {once:true});
      els.spotlightLogo.append(image);
    }
  }
  function renderGenreRails() {
    if (!els.genreRails) return;
    els.genreRails.replaceChildren();
    CATEGORY_ORDER.slice(1).forEach(category => {
      const matches = channels.filter(channel => channel.category === category);
      if (matches.length < 3) return;
      const row = document.createElement("section");
      row.className = "genre-row";
      const heading = document.createElement("div");
      heading.className = "genre-row-heading";
      const title = document.createElement("h3");
      title.textContent = categoryLabel(category);
      const count = document.createElement("span");
      count.textContent = matches.length + (matches.length === 1 ? " channel" : " channels");
      const seeAll = document.createElement("button");
      seeAll.type = "button";
      seeAll.className = "genre-see-all";
      seeAll.dataset.guideCategory = category;
      seeAll.textContent = "See all";
      heading.append(title, count, seeAll);
      const rail = document.createElement("div");
      rail.className = "featured-rail genre-rail";
      rail.setAttribute("aria-label", categoryLabel(category) + " channels");
      matches.slice(0, 12).forEach((channel, index) => {
        const card = makeCard(channel, index);
        card.classList.add("featured-channel");
        rail.append(card);
      });
      row.append(heading, rail);
      els.genreRails.append(row);
    });
  }

  function moveSpotlight(offset) {
    const slides = spotlightSlides();
    if (slides.length < 2) return;
    carouselIndex = (carouselIndex + offset + slides.length) % slides.length;
    renderSpotlight(null);
  }


  function renderTopPicks() {
    if (!els.topPicks) return;
    const withLogos = channels.filter(channel => channel.logo);
    const picks = (withLogos.length >= 6 ? withLogos : channels).slice(0, 10);
    els.topPicks.replaceChildren();
    picks.forEach((channel, index) => {
      const card = makeCard(channel, index);
      card.classList.add("top-pick-card");
      els.topPicks.append(card);
    });
    if (els.topPicksLoading) els.topPicksLoading.hidden = picks.length > 0;
  }

  function renderFeaturedChannels() {
    if (!els.featured) return;
    const withLogos = channels.filter(channel => channel.logo);
    const picks = (withLogos.length >= 6 ? withLogos : channels).slice(0, 12);
    els.featured.replaceChildren();
    picks.forEach((channel, index) => {
      const card = makeCard(channel, index);
      card.classList.add("featured-channel");
      els.featured.append(card);
    });
    renderTopPicks();
    renderGenreRails();
    carouselIndex = spotlightSlides().length ? carouselIndex % spotlightSlides().length : 0;
    renderSpotlight(activeChannel || null);
    if (els.featuredLoading) els.featuredLoading.hidden = true;
  }

  function renderNextPage() {
    const start = page * PAGE_SIZE;
    const batch = filtered.slice(start, start + PAGE_SIZE);
    batch.forEach((channel, i) => els.grid.append(makeCard(channel, start + i)));
    page++;
    els.more.hidden = page * PAGE_SIZE >= filtered.length;
    if (!els.more.hidden) {
      const remaining = filtered.length - page * PAGE_SIZE;
      els.more.innerHTML = "Show " + Math.min(PAGE_SIZE, remaining) + " more channels <span>↓</span>";
    }
  }

  function updateSelectedCard() {
    [els.grid, els.featured, els.topPicks, els.genreRails].filter(Boolean).forEach(container => container.querySelectorAll(".channel-card").forEach(card => {
      const selected = !!activeChannel && card.dataset.channelId === activeChannel.id;
      card.setAttribute("aria-current", selected ? "true" : "false");
      const play = card.querySelector(".channel-play");
      if (play) play.textContent = selected ? "●" : "▶";
    }));
  }

  function showPlayerPlaceholder(show) {
    els.placeholder.classList.toggle("is-hidden", !show);
    els.placeholder.setAttribute("aria-hidden", show ? "false" : "true");
  }

  function playChannel(channel) {
    activeChannel = channel;
    renderSpotlight(channel);
    fallbackIndex = 0;
    waitingForAlternateSource = null;
    lastSourceFailure = null;
    els.title.textContent = channel.name;
    els.subtitle.textContent = channel.group || (countryName() + " · Live television");
    els.region.textContent = countryName().toUpperCase() + " · LIVE TV";
    setMessage("");
    showPlayerPlaceholder(false);
    updateSelectedCard();
    startSource(channel, 0);
    $("player").scrollIntoView({behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block:"start"});
  }

  function startSource(channel, index) {
    window.clearTimeout(playbackTimer);
    els.playStart.hidden = true;
    els.playStart.disabled = false;
    fallbackIndex = index;
    if (index === 0) lastSourceFailure = null;
    if (index >= channel.urls.length) {
      tryNextSource(channel, index, sourceAttemptId);
      return;
    }

    networkRecoveryAttempts = 0;
    mediaRecoveryAttempts = 0;
    const attemptId = destroyPlayer();
    setMessage(index > 0 ? "Trying another available source…" : "");
    setPlaybackState(index > 0 ? "Switching source…" : "Connecting to broadcaster…");
    const url = channel.urls[index];

    const fail = (category, status) => {
      if (!isCurrentSource(channel, index, attemptId)) return;
      recordSourceFailure(channel, index, category, status);
      reportRegistryFailure(channel, channel.urls[index], category === "stalled" ? "stalled" : category === "denied" ? "forbidden" : category === "missing" ? "not_found" : category === "decode" || category === "unsupported" ? "decode" : category === "timeout" ? "startup" : "network");
      tryNextSource(channel, index, attemptId);
    };

    let parsedUrl;
    try { parsedUrl = new URL(url); } catch (_) {
      fail("invalid");
      return;
    }
    if (["rtsp:", "rtmp:", "rtmps:", "udp:", "rtp:", "mms:", "mmsh:"].includes(parsedUrl.protocol)) {
      fail("protocol");
      return;
    }
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      fail("protocol");
      return;
    }

    const path = parsedUrl.pathname.toLowerCase();
    const isDash = path.endsWith(".mpd");
    const isDirectMedia = /\.(mp4|m4v|webm|ogv|ogg|mov|mp3|m4a|aac|wav)$/.test(path);
    const isHls = path.endsWith(".m3u8") || (!isDash && !isDirectMedia && els.video.canPlayType("application/vnd.apple.mpegurl") !== "");
    let nativeHlsFallbackAttempted = false;
    const tryNativeHlsFallback = () => {
      if (nativeHlsFallbackAttempted || hls || !isHls || !window.Hls || !window.Hls.isSupported()) return false;
      nativeHlsFallbackAttempted = true;
      let player;
      try {
        player = new window.Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 30,
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          manifestLoadingTimeOut: 12000,
          levelLoadingTimeOut: 15000,
          fragLoadingTimeOut: 20000,
          manifestLoadingMaxRetry: 2,
          levelLoadingMaxRetry: 2,
          fragLoadingMaxRetry: 2,
          manifestLoadingRetryDelay: 800,
          levelLoadingRetryDelay: 800,
          fragLoadingRetryDelay: 800
        });
      } catch (_) {
        return false;
      }
      hls = player;
      setPlaybackState("Retrying with HLS compatibility playback…");
      player.on(window.Hls.Events.MEDIA_ATTACHED, () => {
        if (!isCurrentSource(channel, index, attemptId)) return;
        try { player.loadSource(url); } catch (_) { fail("network"); }
      });
      player.on(window.Hls.Events.MANIFEST_PARSED, () => {
        if (!isCurrentSource(channel, index, attemptId)) return;
        setPlaybackState("Stream ready");
        setMessage("");
        requestPlayback(channel, index, attemptId);
      });
      player.on(window.Hls.Events.ERROR, (_event, data) => {
        if (!isCurrentSource(channel, index, attemptId) || !data || !data.fatal) return;
        const status = Number(data.response && data.response.code) || 0;
        if ([401, 403].includes(status)) {
          fail("denied", status);
        } else if ([404, 410].includes(status)) {
          fail("missing", status);
        } else if (data.type === window.Hls.ErrorTypes.NETWORK_ERROR && networkRecoveryAttempts < 1) {
          networkRecoveryAttempts++;
          setPlaybackState("Reconnecting…");
          try { player.startLoad(); } catch (_) { fail("network", status || undefined); }
        } else if (data.type === window.Hls.ErrorTypes.MEDIA_ERROR && mediaRecoveryAttempts < 1) {
          mediaRecoveryAttempts++;
          setPlaybackState("Recovering playback…");
          try { player.recoverMediaError(); } catch (_) { fail("decode", status || undefined); }
        } else {
          fail(data.type === window.Hls.ErrorTypes.MEDIA_ERROR ? "decode" : "network", status || undefined);
        }
      });
      try {
        player.attachMedia(els.video);
        return true;
      } catch (_) {
        try { player.destroy(); } catch (_) {}
        if (hls === player) hls = null;
        return false;
      }
    };

    els.video.onplaying = () => {
      if (!isCurrentSource(channel, index, attemptId)) return;
      window.clearTimeout(playbackTimer);
      setPlaybackState("Playing live");
      setMessage("");
      els.playStart.hidden = true;
      els.playStart.disabled = false;
      showPlayerPlaceholder(false);
    };
    const startStallTimer = (state) => {
      if (!isCurrentSource(channel, index, attemptId) || els.video.readyState < 2) return;
      setPlaybackState(state);
      window.clearTimeout(playbackTimer);
      playbackTimer = window.setTimeout(() => {
        if (isCurrentSource(channel, index, attemptId) && els.video.readyState < 3) fail("stalled");
      }, BUFFER_STALL_TIMEOUT_MS);
    };
    els.video.onwaiting = () => startStallTimer("Buffering…");
    els.video.onstalled = () => startStallTimer("Connection stalled…");
    els.video.onerror = () => {
      if (!isCurrentSource(channel, index, attemptId)) return;
      const mediaCode = els.video.error ? els.video.error.code : 0;
      if (mediaCode === 4 && tryNativeHlsFallback()) return;
      fail(mediaCode === 3 ? "decode" : mediaCode === 4 ? "unsupported" : "network", mediaCode || undefined);
    };

    if (isDash) {
      if (!window.dashjs || !window.dashjs.MediaPlayer) {
        fail("player");
        return;
      }
      try {
        const player = window.dashjs.MediaPlayer().create();
        dashPlayer = player;
        els.video.oncanplay = () => {
          if (isCurrentSource(channel, index, attemptId)) requestPlayback(channel, index, attemptId);
        };
        player.on(window.dashjs.MediaPlayer.events.ERROR, () => {
          if (isCurrentSource(channel, index, attemptId)) fail("network");
        });
        player.initialize(els.video, url, false);
      } catch (_) {
        fail("player");
        return;
      }
    } else if (isDirectMedia) {
      els.video.src = url;
      els.video.load();
      requestPlayback(channel, index, attemptId);
    } else if (els.video.canPlayType("application/vnd.apple.mpegurl")) {
      els.video.src = url;
      els.video.load();
      requestPlayback(channel, index, attemptId);
    } else if (window.Hls && window.Hls.isSupported()) {
      let player;
      try {
        player = new window.Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 30,
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          manifestLoadingTimeOut: 12000,
          levelLoadingTimeOut: 15000,
          fragLoadingTimeOut: 20000,
          manifestLoadingMaxRetry: 2,
          levelLoadingMaxRetry: 2,
          fragLoadingMaxRetry: 2,
          manifestLoadingRetryDelay: 800,
          levelLoadingRetryDelay: 800,
          fragLoadingRetryDelay: 800
        });
      } catch (_) {
        fail("player");
        return;
      }
      hls = player;
      player.on(window.Hls.Events.MEDIA_ATTACHED, () => {
        if (!isCurrentSource(channel, index, attemptId)) return;
        try { player.loadSource(url); } catch (_) { fail("network"); }
      });
      player.on(window.Hls.Events.MANIFEST_PARSED, () => {
        if (!isCurrentSource(channel, index, attemptId)) return;
        setPlaybackState("Stream ready");
        setMessage("");
        requestPlayback(channel, index, attemptId);
      });
      player.on(window.Hls.Events.ERROR, (_event, data) => {
        if (!isCurrentSource(channel, index, attemptId) || !data || !data.fatal) return;
        const status = Number(data.response && data.response.code) || 0;
        if ([401, 403].includes(status)) {
          fail("denied", status);
          return;
        }
        if ([404, 410].includes(status)) {
          fail("missing", status);
          return;
        }
        if (data.type === window.Hls.ErrorTypes.NETWORK_ERROR && networkRecoveryAttempts < 1) {
          networkRecoveryAttempts++;
          setPlaybackState("Reconnecting…");
          try { player.startLoad(); } catch (_) { fail("network", status || undefined); }
        } else if (data.type === window.Hls.ErrorTypes.MEDIA_ERROR && mediaRecoveryAttempts < 1) {
          mediaRecoveryAttempts++;
          setPlaybackState("Recovering playback…");
          try { player.recoverMediaError(); } catch (_) { fail("decode", status || undefined); }
        } else {
          fail(data.type === window.Hls.ErrorTypes.MEDIA_ERROR ? "decode" : "network", status || undefined);
        }
      });
      try { player.attachMedia(els.video); } catch (_) { fail("player"); return; }
    } else {
      fail("unsupported");
      return;
    }

    const startupLimit = isHls || isDash ? STREAM_STARTUP_TIMEOUT_MS : DIRECT_STARTUP_TIMEOUT_MS;
    playbackTimer = window.setTimeout(() => {
      if (isCurrentSource(channel, index, attemptId) && els.video.readyState < 2) fail("timeout");
    }, startupLimit);
  }

  function tryNextSource(channel, currentIndex, attemptId) {
    if (activeChannel !== channel || fallbackIndex !== currentIndex) return;
    if (attemptId !== undefined && sourceAttemptId !== attemptId) return;
    window.clearTimeout(playbackTimer);
    if (currentIndex + 1 < channel.urls.length) {
      startSource(channel, currentIndex + 1);
    } else if (alternatePlaylistPending) {
      const waitingAttemptId = destroyPlayer();
      waitingForAlternateSource = {channel, index:currentIndex, attemptId:waitingAttemptId};
      setPlaybackState("Checking alternate links…");
      setMessage("The current stream did not start. Checking for another available channel link.");
      showPlayerPlaceholder(false);
    } else if (REGISTRY_BASE && !registryRefreshAttempted.has(channel)) {
      const failedAttemptId = sourceAttemptId;
      setPlaybackState("Finding approved alternatives…");
      setMessage("Checking Yocare’s approved source registry for another available feed.");
      refreshRegistrySources(channel).then(added => {
        if (activeChannel !== channel || sourceAttemptId !== failedAttemptId) return;
        if (added && channel.urls.length > currentIndex + 1) {
          startSource(channel, currentIndex + 1);
          return;
        }
        destroyPlayer();
        setPlaybackState("Stream unavailable");
        const cause = lastSourceFailure
          ? sourceFailureMessage(lastSourceFailure)
          : "no playable source was listed";
        setMessage("Yocare could not start this channel because " + cause + ". No alternate configured feed was available. Retry later or choose another channel.");
        showPlayerPlaceholder(true);
      });
    } else {
      destroyPlayer();
      setPlaybackState("Stream unavailable");
      const cause = lastSourceFailure
        ? sourceFailureMessage(lastSourceFailure)
        : "no playable source was listed";
      setMessage("Yocare could not start this channel because " + cause + ". No alternate configured feed was available. Retry later or choose another channel.");
      showPlayerPlaceholder(true);
    }
  }

  function renderCategories() {
    const counts = channels.reduce((acc, channel) => {
      acc[channel.category] = (acc[channel.category] || 0) + 1;
      return acc;
    }, {});
    els.categories.replaceChildren();
    CATEGORY_ORDER.forEach(category => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "category-chip" + (category === activeFilter ? " selected" : "");
      button.dataset.category = category;
      button.setAttribute("aria-pressed", String(category === activeFilter));
      const label = document.createElement("span");
      label.textContent = categoryLabel(category);
      const count = document.createElement("span");
      count.className = "category-chip-count";
      count.textContent = category === "all" ? String(channels.length) : String(counts[category] || 0);
      button.append(label, count);
      button.disabled = category !== "all" && !counts[category];
      els.categories.append(button);
    });
  }

  function setCategory(category) {
    activeFilter = category;
    els.categories.querySelectorAll(".category-chip").forEach(button => {
      const selected = button.dataset.category === category;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    applyFilters();
  }

  els.country.addEventListener("change", () => {
    // Keep the current video playing while the channel guide changes only if the viewer wants;
    // a country change stops playback to avoid a misleading region label.
    activeChannel = null;
    destroyPlayer();
    showPlayerPlaceholder(true);
    els.title.textContent = "Select a channel";
    els.subtitle.textContent = "Your channel will appear here";
    setPlaybackState("Ready when you are");
    setMessage("");
    loadCountry(els.country.value);
  });
  els.search.addEventListener("input", applyFilters);
  els.searchAction.addEventListener("click", () => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    els.search.scrollIntoView({behavior: reducedMotion ? "auto" : "smooth", block: "center"});
    window.setTimeout(() => els.search.focus({preventScroll:true}), reducedMotion ? 0 : 420);
  });
  els.spotlightPlay.addEventListener("click", () => {
    if (spotlightChannel) playChannel(spotlightChannel);
  });
  els.spotlightCard.addEventListener("click", () => {
    if (spotlightChannel) playChannel(spotlightChannel);
  });
  els.spotlightPrev.addEventListener("click", () => moveSpotlight(-1));
  els.spotlightNext.addEventListener("click", () => moveSpotlight(1));
  els.genreRails.addEventListener("click", event => {
    const button = event.target.closest("[data-guide-category]");
    if (!button) return;
    setCategory(button.dataset.guideCategory);
    $("channels").scrollIntoView({behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block:"start"});
  });
  els.more.addEventListener("click", renderNextPage);
  els.categories.addEventListener("click", (event) => {
    const button = event.target.closest(".category-chip");
    if (button && !button.disabled) setCategory(button.dataset.category);
  });
  els.clear.addEventListener("click", () => {
    if (!channels.length) {
      loadCountry(els.country.value);
      return;
    }
    els.search.value = "";
    setCategory("all");
  });
  els.playStart.addEventListener("click", () => {
    if (!activeChannel) return;
    els.playStart.disabled = true;
    requestPlayback(activeChannel, fallbackIndex, sourceAttemptId);
  });
  els.retry.addEventListener("click", () => {
    if (activeChannel) {
      waitingForAlternateSource = null;
      fallbackIndex = 0;
      lastSourceFailure = null;
      registryRefreshAttempted.delete(activeChannel);
      registryRefreshes.delete(activeChannel);
      startSource(activeChannel, 0);
    } else {
      loadCountry(els.country.value);
    }
  });
  function focusableTvControls() {
    return [...document.querySelectorAll('a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),[tabindex]:not([tabindex="-1"])')]
      .filter(element => {
        if (element.classList.contains("skip-link") || element.closest("[hidden], [aria-hidden='true']")) return false;
        const style = window.getComputedStyle(element);
        return style.display !== "none" && style.visibility !== "hidden" && element.getClientRects().length > 0;
      });
  }

  function handleTvRemoteKeys(event) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.target instanceof Element ? event.target : null;
    const editing = target ? target.closest("input, textarea, select, video, [contenteditable='true']") : null;
    if (["Escape", "Back", "BrowserBack"].includes(event.key) && !editing && !document.fullscreenElement) {
      const home = document.querySelector('.topnav a[href="#discover"]');
      if (home) {
        home.focus();
        home.scrollIntoView({block:"start"});
        event.preventDefault();
      }
      return;
    }
    if (event.key === "Accept" && !editing) {
      const focused = document.activeElement;
      if (focused instanceof HTMLElement && focused.matches('a[href],button:not(:disabled)')) {
        focused.click();
        event.preventDefault();
      }
      return;
    }
    const direction = {ArrowLeft:"left", ArrowRight:"right", ArrowUp:"up", ArrowDown:"down"}[event.key];
    if (!direction || editing) return;
    const controls = focusableTvControls();
    const current = document.activeElement;
    if (!controls.includes(current)) {
      const first = document.querySelector('.topnav a[href="#discover"]');
      if (first) first.focus();
      event.preventDefault();
      return;
    }
    const source = current.getBoundingClientRect();
    const sx = source.left + source.width / 2;
    const sy = source.top + source.height / 2;
    let best = null;
    let bestScore = Infinity;
    controls.forEach(candidate => {
      if (candidate === current) return;
      const rect = candidate.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      const primary = direction === "left" ? sx - x : direction === "right" ? x - sx : direction === "up" ? sy - y : y - sy;
      if (primary <= 8) return;
      const cross = direction === "left" || direction === "right" ? Math.abs(y - sy) : Math.abs(x - sx);
      const score = primary + cross * 1.65;
      if (score < bestScore) { best = candidate; bestScore = score; }
    });
    if (best) {
      best.focus({preventScroll:true});
      best.scrollIntoView({block:"nearest", inline:"nearest"});
      event.preventDefault();
    }
  }

  window.addEventListener("keydown", handleTvRemoteKeys);
  window.addEventListener("pagehide", () => {
    if (loadController) loadController.abort();
    destroyPlayer();
  });

  window.setInterval(() => {
    if (Object.keys(guideChannels()).length) renderProgramGuide();
  }, 60_000);
  window.setInterval(() => {
    if (spotlightSlides().length > 1 && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) moveSpotlight(1);
  }, 9_000);

  loadCountry(els.country.value);
})();