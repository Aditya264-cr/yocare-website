(() => {
  "use strict";

  const PLAYLIST_BASE = "https://iptv-org.github.io/iptv/streams/";
  const PAGE_SIZE = 24;
  const $ = (id) => document.getElementById(id);
  const els = {
    video: $("video"), placeholder: $("player-placeholder"), grid: $("channel-grid"),
    country: $("country-select"), search: $("search-input"), count: $("channel-count"),
    loading: $("load-state"), empty: $("empty-state"), more: $("load-more"),
    title: $("now-title"), subtitle: $("now-subtitle"), region: $("player-region"),
    state: $("playback-state"), message: $("player-message"), retry: $("retry-button"),
    clear: $("clear-search"), all: $("all-filter"), news: $("news-filter"),
    music: $("music-filter"), religion: $("religion-filter")
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
    const words = name.replace(/\([^)]*\)/g, "").trim().split(/\s+/).filter(Boolean);
    return (words.length > 1 ? words.slice(0, 2).map(w => w[0]) : (words[0] || "TV").slice(0, 2)).join("").toUpperCase();
  };
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

  async function fetchPlaylistText(code, signal) {
    const encoded = encodeURIComponent(code);
    const sources = [
      PLAYLIST_BASE + encoded + ".m3u",
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
    throw lastError || new Error("All channel-list sources were unavailable.");
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
      const text = await fetchPlaylistText(code, loadController.signal);
      if (currentRequest !== requestNumber) return;
      const result = parsePlaylist(text);
      if (!result.length) throw new Error("The playlist did not contain readable channel entries.");
      channels = result;
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
    logo.className = "channel-logo";
    logo.textContent = initialsFor(channel.name);
    if (channel.logo && /^https?:\/\//i.test(channel.logo)) {
      const image = document.createElement("img");
      image.loading = "lazy";
      image.alt = "";
      image.referrerPolicy = "no-referrer";
      image.src = channel.logo;
      image.addEventListener("error", () => image.remove(), {once:true});
      logo.replaceChildren(image);
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
    tag.textContent = channel.category === "religion" ? "Spiritual" : channel.category;
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
        if (data.type === window.Hls.ErrorTypes.NETWORK_ERROR) {
          setPlaybackState("Reconnecting…");
          try { hls.startLoad(); } catch (_) { tryNextSource(channel, index); }
        } else if (data.type === window.Hls.ErrorTypes.MEDIA_ERROR) {
          setPlaybackState("Recovering playback…");
          try { hls.recoverMediaError(); } catch (_) { tryNextSource(channel, index); }
        } else {
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
    els.video.onwaiting = () => setPlaybackState("Buffering…");
    els.video.onstalled = () => setPlaybackState("Connection stalled…");
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

  function setCategory(category, button) {
    activeFilter = category;
    [els.all, els.news, els.music, els.religion].forEach(el => {
      const selected = el === button;
      el.classList.toggle("selected", selected);
      el.setAttribute("aria-pressed", String(selected));
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
  els.all.addEventListener("click", () => setCategory("all", els.all));
  els.news.addEventListener("click", () => setCategory("news", els.news));
  els.music.addEventListener("click", () => setCategory("music", els.music));
  els.religion.addEventListener("click", () => setCategory("religion", els.religion));
  els.clear.addEventListener("click", () => {
    if (!channels.length) {
      loadCountry(els.country.value);
      return;
    }
    els.search.value = "";
    setCategory("all", els.all);
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