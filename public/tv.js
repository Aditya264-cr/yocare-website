(() => {
  "use strict";

  const PLAYLIST_BASE = "https://iptv-org.github.io/iptv/";
  const PAGE_SIZE = 48;
  const $ = (id) => document.getElementById(id);
  const els = {
    video: $("video"), placeholder: $("player-placeholder"), grid: $("channel-grid"),
    country: $("country-select"), search: $("search-input"), count: $("channel-count"),
    loading: $("load-state"), empty: $("empty-state"), more: $("load-more"),
    title: $("now-title"), subtitle: $("now-subtitle"), region: $("player-region"),
    state: $("playback-state"), message: $("player-message"), retry: $("retry-button"),
    clear: $("clear-search"), categories: $("category-chips"),
    categorySummary: $("category-summary"), visibleSummary: $("visible-summary")
  };

  let channels = [];
  let filtered = [];
  let page = 0;
  let activeFilter = "all";
  let activeChannel = null;
  let fallbackIndex = 0;
  let hls = null;
  let loadController = null;
  let requestNumber = 0;
  let playbackTimer = 0;
  let isLoadingPlaylist = false;
  let networkRecoveryAttempts = 0;
  let mediaRecoveryAttempts = 0;

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
      } else if (/^https?:\/\//i.test(line)) {
        try {
          const url = new URL(line);
          if (url.protocol === "http:" || url.protocol === "https:") {
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

  function destroyPlayer() {
    window.clearTimeout(playbackTimer);
    if (hls) {
      try { hls.destroy(); } catch (_) {}
      hls = null;
    }
    els.video.pause();
    els.video.removeAttribute("src");
    els.video.load();
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
      try {
        const response = await fetch(source, {
          signal,
          cache: "no-cache",
          headers: {"Accept": "application/vnd.apple.mpegurl, audio/x-mpegurl, text/plain, */*"}
        });
        if (!response.ok) throw new Error("Playlist source returned HTTP " + response.status + ".");
        const text = await response.text();
        if (!text.includes("#EXTINF:")) throw new Error("Playlist source returned no channel entries.");
        return text;
      } catch (error) {
        if (error.name === "AbortError") throw error;
        lastError = error;
      }
    }
    throw lastError || new Error("All " + kind + " playlist sources were unavailable.");
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
    loadController = new AbortController();
    const currentRequest = ++requestNumber;
    setLoading(true, "Loading channels for " + countryName() + "…");
    els.grid.replaceChildren();
    els.empty.hidden = true;
    els.more.hidden = true;
    channels = [];
    filtered = [];
    els.count.textContent = "—";
    els.region.textContent = countryName().toUpperCase() + " · LIVE TV";
    try {
      // Public playlists are generated for viewers and select the preferred stream per channel.
      // The internal streams playlist is merged in as fallback URLs, not used as the primary list.
      const results = await Promise.allSettled([
        fetchPlaylistText(code, loadController.signal, "public"),
        fetchPlaylistText(code, loadController.signal, "streams")
      ]);
      if (currentRequest !== requestNumber) return;
      const publicText = results[0].status === "fulfilled" ? results[0].value : "";
      const streamsText = results[1].status === "fulfilled" ? results[1].value : "";
      if (!publicText && !streamsText) {
        const reason = results.find(result => result.status === "rejected");
        throw (reason && reason.reason) || new Error("All channel-list sources were unavailable.");
      }
      const publicChannels = publicText ? parsePlaylist(publicText) : [];
      const alternateChannels = streamsText ? parsePlaylist(streamsText) : [];
      const result = mergePlaylistSources(publicChannels, alternateChannels);
      if (!result.length) throw new Error("The playlists did not contain readable channel entries.");
      channels = result;
      renderCategories();
      applyFilters();
      setLoading(false);
    } catch (error) {
      if (error.name === "AbortError" || currentRequest !== requestNumber) return;
      setLoading(false);
      els.grid.replaceChildren();
      els.empty.hidden = false;
      els.empty.querySelector("h3").textContent = "Channel guide unavailable";
      els.empty.querySelector("p").textContent = "We couldn’t load this country’s channel list. Check your connection, then retry. (" + (error.message || "Network error") + ")";
      els.clear.textContent = "Retry channel guide";
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
    els.grid.querySelectorAll(".channel-card").forEach(card => {
      const selected = !!activeChannel && card.dataset.channelId === activeChannel.id;
      card.setAttribute("aria-current", selected ? "true" : "false");
      const play = card.querySelector(".channel-play");
      if (play) play.textContent = selected ? "●" : "▶";
    });
  }

  function showPlayerPlaceholder(show) {
    els.placeholder.classList.toggle("is-hidden", !show);
    els.placeholder.setAttribute("aria-hidden", show ? "false" : "true");
  }

  function playChannel(channel) {
    activeChannel = channel;
    fallbackIndex = 0;
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
    if (index >= channel.urls.length) {
      setPlaybackState("Stream unavailable");
      setMessage("This channel’s available links did not start. Try another channel or come back later; broadcaster links can go offline or block playback.");
      showPlayerPlaceholder(true);
      return;
    }
    fallbackIndex = index;
    networkRecoveryAttempts = 0;
    mediaRecoveryAttempts = 0;
    destroyPlayer();
    setMessage(index > 0 ? "Trying another available source…" : "");
    setPlaybackState(index > 0 ? "Switching source…" : "Connecting to broadcaster…");
    const url = channel.urls[index];

    // Some broadcasters provide native HLS; others require hls.js in Chromium browsers.
    if (els.video.canPlayType("application/vnd.apple.mpegurl")) {
      els.video.src = url;
      els.video.load();
      els.video.play().catch(() => {
        setPlaybackState("Ready to play");
        setMessage("Press play in the video controls if playback did not start automatically.");
      });
    } else if (window.Hls && window.Hls.isSupported()) {
      hls = new window.Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 30,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        manifestLoadingTimeOut: 15000,
        levelLoadingTimeOut: 20000,
        fragLoadingTimeOut: 25000,
        manifestLoadingMaxRetry: 2,
        levelLoadingMaxRetry: 2,
        fragLoadingMaxRetry: 3,
        manifestLoadingRetryDelay: 800,
        levelLoadingRetryDelay: 800,
        fragLoadingRetryDelay: 800
      });
      hls.attachMedia(els.video);
      hls.on(window.Hls.Events.MEDIA_ATTACHED, () => {
        if (activeChannel !== channel) return;
        hls.loadSource(url);
      });
      hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
        if (activeChannel !== channel) return;
        setPlaybackState("Stream ready");
        setMessage("");
        els.video.play().catch(() => {
          setPlaybackState("Ready to play");
          setMessage("Your browser needs a tap on Play to start this stream.");
        });
      });
      hls.on(window.Hls.Events.ERROR, (_event, data) => {
        if (activeChannel !== channel || !data.fatal) return;
        if (data.type === window.Hls.ErrorTypes.NETWORK_ERROR && networkRecoveryAttempts < 1) {
          networkRecoveryAttempts++;
          setPlaybackState("Reconnecting…");
          try { hls.startLoad(); } catch (_) { tryNextSource(channel, index); }
        } else if (data.type === window.Hls.ErrorTypes.MEDIA_ERROR && mediaRecoveryAttempts < 1) {
          mediaRecoveryAttempts++;
          setPlaybackState("Recovering playback…");
          try { hls.recoverMediaError(); } catch (_) { tryNextSource(channel, index); }
        } else {
          // Avoid looping forever on a fatal offline, blocked, or incompatible source.
          tryNextSource(channel, index);
        }
      });
    } else {
      setPlaybackState("Playback unsupported");
      setMessage("This browser does not support HLS playback. Try a current version of Safari, Chrome, Edge, or Firefox.");
      showPlayerPlaceholder(true);
      return;
    }

    // If a stream never becomes playable, move to its next available URL.
    playbackTimer = window.setTimeout(() => {
      if (activeChannel === channel && els.video.readyState < 2) tryNextSource(channel, index);
    }, 18000);
    els.video.onplaying = () => {
      window.clearTimeout(playbackTimer);
      setPlaybackState("Playing live");
      setMessage("");
      showPlayerPlaceholder(false);
    };
    els.video.onwaiting = () => {
      setPlaybackState("Buffering…");
      window.clearTimeout(playbackTimer);
      playbackTimer = window.setTimeout(() => {
        if (activeChannel === channel && fallbackIndex === index && els.video.readyState < 3) {
          tryNextSource(channel, index);
        }
      }, 15000);
    };
    els.video.onstalled = () => {
      setPlaybackState("Connection stalled…");
      window.clearTimeout(playbackTimer);
      playbackTimer = window.setTimeout(() => {
        if (activeChannel === channel && fallbackIndex === index) tryNextSource(channel, index);
      }, 15000);
    };
    els.video.onerror = () => {
      if (activeChannel === channel) tryNextSource(channel, index);
    };
  }

  function tryNextSource(channel, currentIndex) {
    if (activeChannel !== channel || fallbackIndex !== currentIndex) return;
    window.clearTimeout(playbackTimer);
    if (currentIndex + 1 < channel.urls.length) {
      startSource(channel, currentIndex + 1);
    } else {
      setPlaybackState("Stream unavailable");
      setMessage("The broadcaster did not provide a playable stream. Try another channel. Yocare cannot repair an offline or access-restricted broadcaster link.");
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
  els.retry.addEventListener("click", () => {
    if (activeChannel) {
      fallbackIndex = 0;
      startSource(activeChannel, 0);
    } else {
      loadCountry(els.country.value);
    }
  });
  window.addEventListener("pagehide", () => {
    if (loadController) loadController.abort();
    destroyPlayer();
  });

  loadCountry(els.country.value);
})();