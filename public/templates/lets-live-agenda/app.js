(() => {
  "use strict";

  const config = window.POA_CONFIG || {};
  const agendaList = document.getElementById("agendaList");
  let agendaItems = [];
  let sessionMap = new Map();
  let lastSyncToken = null;
  let requestInFlight = false;
  let state = { ...(config.FALLBACK_STATE || {}) };

  const sessionIconPaths = {
    calendar: ["M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"],
    presentation: ["M3 3h18v13H3ZM8 21l4-5 4 5M8 9h8"],
    meeting: ["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"],
    keynote: ["M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3ZM19 10v2a7 7 0 0 1-14 0v-2M12 19v3M8 22h8"],
    workshop: ["M14.7 6.3a4 4 0 0 0-5-5L12 3.6 9.6 6 7.3 3.7a4 4 0 0 0 5 5L5 16l3 3 7.3-7.3a4 4 0 0 0 5-5L18 9l-3-3Z"],
    breakout: ["M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M8.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M15.5 3.13a4 4 0 0 1 0 7.75"],
    lunch: ["M3 2v8a3 3 0 0 0 3 3V2M6 2v20M10 2v5a4 4 0 0 0 4 4V2M14 2v20M21 2c-2 3-2 7-2 10v10"],
    break: ["M3 8h13v7a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5ZM16 10h2a3 3 0 0 1 0 6h-2M6 2v3M10 2v3M14 2v3"],
    networking: ["M12 5a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM5 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM10.5 5.5 6.5 12M13.5 5.5l4 6.5M8 15h8"],
    qa: ["M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4ZM9.5 9a2.5 2.5 0 1 1 3.8 2.1c-.8.5-1.3 1-1.3 1.9M12 16h.01"],
    video: ["M15 10l5-3v10l-5-3ZM3 5h12v14H3Z"],
    training: ["m2 10 10-5 10 5-10 5ZM6 12v5c3 2 9 2 12 0v-5M22 10v6"],
    award: ["M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12ZM8.5 14 7 22l5-3 5 3-1.5-8"],
    celebration: ["M4 22l4-14 8 8ZM7 17l5-5M14 2l1 3M20 6l-3 1M18 12l3 1M9 3l2 2"]
  };

  const meetingProviderIconPaths = {
    zoom: ["M3 7a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2ZM16 9l5-3v12l-5-3Z"],
    teams: ["M4 6h10v12H4ZM7 10h5M9.5 10v5", "M18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM15.5 17v-3a2.5 2.5 0 0 1 5 0v3"],
    meet: ["M3 7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2ZM17 10l4-3v10l-4-3Z"],
    webex: ["M5.2 8.2A8 8 0 0 1 18 5.5M18.8 15.8A8 8 0 0 1 6 18.5", "m18 4 .2 3-3-.2M6 20l-.2-3 3 .2"],
    youtube: ["M3 7.5A3.5 3.5 0 0 1 6.5 4h11A3.5 3.5 0 0 1 21 7.5v9a3.5 3.5 0 0 1-3.5 3.5h-11A3.5 3.5 0 0 1 3 16.5ZM10 9l5 3-5 3Z"],
    goto: ["M8 7a5 5 0 0 1 8.5 3.5L19 8M19 8v5h-5", "M16 17a5 5 0 0 1-8.5-3.5L5 16M5 16v-5h5"],
    meeting: ["M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1"]
  };

  const els = {
    eventGate: document.getElementById("eventGate"),
    eventGateTitle: document.getElementById("eventGateTitle"),
    eventTitle: document.getElementById("eventTitle"),
    eventDescription: document.getElementById("eventDescription"),
    surveyPage: document.getElementById("surveyPage"),
    surveyFrame: document.getElementById("surveyFrame"),
    surveyExternalLink: document.getElementById("surveyExternalLink"),
    enterButton: document.getElementById("enterButton"),
    enterButtonText: document.getElementById("enterButtonText"),
    meetingProviderIcon: document.getElementById("meetingProviderIcon"),
    meetingProviderLabel: document.getElementById("meetingProviderLabel"),
    liveLabel: document.getElementById("liveLabel"),
    liveSessionName: document.getElementById("liveSessionName"),
    liveSessionTime: document.getElementById("liveSessionTime"),
    nextUp: document.getElementById("nextUp"),
    nextSessionName: document.getElementById("nextSessionName"),
    nextSessionTime: document.getElementById("nextSessionTime"),
    eventClock: document.getElementById("eventClock"),
    eventDate: document.getElementById("eventDate"),
    countdownLabel: document.getElementById("countdownLabel"),
    countdownValue: document.getElementById("countdownValue"),
    countdownSession: document.getElementById("countdownSession"),
    statusPill: document.getElementById("statusPill"),
    eventDayDate: document.getElementById("eventDayDate"),
    announcement: document.getElementById("runtimeAnnouncement"),
    announcementText: document.getElementById("runtimeAnnouncementText"),
    speakerPanel: document.getElementById("speakerPanel"),
    speakerPanelClose: document.getElementById("speakerPanelClose"),
    speakerPanelLabel: document.getElementById("speakerPanelLabel"),
    speakerPortrait: document.querySelector(".speaker-portrait"),
    speakerPhoto: document.getElementById("speakerPhoto"),
    speakerInitials: document.getElementById("speakerInitials"),
    speakerName: document.getElementById("speakerName"),
    speakerRole: document.getElementById("speakerRole"),
    speakerBio: document.getElementById("speakerBio"),
    speakerSession: document.getElementById("speakerSession"),
    speakerTime: document.getElementById("speakerTime")
  };

  function firstValue(...values) {
    return values.find(value => value !== undefined && value !== null && value !== "");
  }

  function hostnameMatches(hostname, domain) {
    return hostname === domain || hostname.endsWith(`.${domain}`);
  }

  function detectMeetingProvider(value) {
    let hostname = "";
    try {
      hostname = new URL(value).hostname.toLowerCase().replace(/^www\./, "");
    } catch {
      return { key: "meeting", label: "Meeting link" };
    }

    if (hostnameMatches(hostname, "zoom.us") || hostnameMatches(hostname, "zoomgov.com")) {
      return { key: "zoom", label: "Zoom" };
    }
    if (hostnameMatches(hostname, "teams.microsoft.com") || hostnameMatches(hostname, "teams.live.com") || hostnameMatches(hostname, "teams.cloud.microsoft")) {
      return { key: "teams", label: "Microsoft Teams" };
    }
    if (hostnameMatches(hostname, "meet.google.com")) {
      return { key: "meet", label: "Google Meet" };
    }
    if (hostnameMatches(hostname, "webex.com")) {
      return { key: "webex", label: "Webex" };
    }
    if (hostnameMatches(hostname, "youtube.com") || hostnameMatches(hostname, "youtu.be")) {
      return { key: "youtube", label: "YouTube Live" };
    }
    if (hostnameMatches(hostname, "gotomeeting.com") || hostnameMatches(hostname, "goto.com")) {
      return { key: "goto", label: "GoTo Meeting" };
    }
    return { key: "meeting", label: "Meeting link" };
  }

  function createMeetingProviderIcon(providerKey) {
    const paths = meetingProviderIconPaths[providerKey] || meetingProviderIconPaths.meeting;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.classList.add("meeting-provider-svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    paths.forEach(pathData => {
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", pathData);
      svg.append(path);
    });
    return svg;
  }

  function updateMeetingProvider(url) {
    const provider = detectMeetingProvider(url);
    if (els.meetingProviderIcon) {
      els.meetingProviderIcon.replaceChildren(createMeetingProviderIcon(provider.key));
    }
    if (els.meetingProviderLabel) els.meetingProviderLabel.textContent = provider.label;
    if (els.enterButton) els.enterButton.dataset.provider = provider.key;
  }

  function sessionKey(session) {
    if (typeof session === "string" || typeof session === "number") return String(session);
    return String(firstValue(session?.session_key, session?.key, session?.slug, session?.id, ""));
  }

  function normalizeResources(value) {
    if (!Array.isArray(value)) return [];
    return value.filter(resource => resource && /^https:\/\//i.test(resource.url || "") && resource.label).map(resource => ({
      id: String(resource.id || resource.url),
      label: String(resource.label),
      url: String(resource.url),
      fileName: String(resource.file_name || resource.label),
      mimeType: String(resource.mime_type || "")
    }));
  }

  function formatRuntimeTime(value) {
    if (!value) return "";
    if (/^\d{1,2}:\d{2}/.test(value)) {
      const [hour, minute] = value.slice(0, 5).split(":").map(Number);
      return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
        .format(new Date(2000, 0, 1, hour, minute));
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat("en-US", {
      timeZone: config.TIME_ZONE || "America/New_York",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    }).format(date);
  }

  function localTimeValue(value) {
    if (!value) return "";
    if (/^\d{1,2}:\d{2}/.test(value)) return value.slice(0, 5).padStart(5, "0");
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: config.TIME_ZONE || "America/New_York",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23"
    }).formatToParts(date);
    const values = Object.fromEntries(parts.filter(part => part.type !== "literal").map(part => [part.type, part.value]));
    return `${values.hour}:${values.minute}`;
  }

  function formatSessionDuration(startValue, endValue) {
    if (!startValue || !endValue) return "";
    let milliseconds;
    if (/^\d{1,2}:\d{2}/.test(startValue) && /^\d{1,2}:\d{2}/.test(endValue)) {
      const [startHour, startMinute] = startValue.slice(0, 5).split(":").map(Number);
      const [endHour, endMinute] = endValue.slice(0, 5).split(":").map(Number);
      const startMinutes = startHour * 60 + startMinute;
      let endMinutes = endHour * 60 + endMinute;
      if (endMinutes < startMinutes) endMinutes += 24 * 60;
      milliseconds = (endMinutes - startMinutes) * 60000;
    } else {
      milliseconds = new Date(endValue).getTime() - new Date(startValue).getTime();
    }
    if (!Number.isFinite(milliseconds) || milliseconds < 0) return "";
    const totalMinutes = Math.round(milliseconds / 60000);
    if (totalMinutes < 1) return "Less than 1 min";
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours === 0) return `${minutes} min`;
    if (minutes === 0) return `${hours} hr${hours === 1 ? "" : "s"}`;
    return `${hours} hr${hours === 1 ? "" : "s"} ${minutes} min`;
  }

  function refreshAgendaIndex() {
    agendaItems = Array.from(document.querySelectorAll(".agenda-item"));
    sessionMap = new Map(agendaItems.map((item, index) => {
      const key = item.dataset.session;
      const localProfile = config.SPEAKER_PROFILES?.[key] || {};
      const session = {
        item,
        index,
        key,
        name: item.querySelector("h3")?.textContent?.trim() || "",
        displayTime: `${item.querySelector(".agenda-time span")?.textContent || ""}–${item.querySelector(".agenda-time small")?.textContent || ""} ET`,
        start: item.dataset.start,
        end: item.dataset.end,
        description: item.dataset.description || "",
        speaker: firstValue(item.dataset.speaker, localProfile.name, ""),
        speakerRole: firstValue(item.dataset.speakerRole, localProfile.role, ""),
        speakerBio: firstValue(item.dataset.speakerBio, localProfile.bio, item.dataset.description, ""),
        speakerPhoto: firstValue(item.dataset.speakerPhoto, localProfile.photo_url, ""),
        showSessionDetails: item.dataset.showSessionDetails !== "false",
        showSpeakerPhoto: item.dataset.showSpeakerPhoto !== "false",
        resources: normalizeResources(JSON.parse(item.dataset.resources || "[]")),
        showResources: item.dataset.showResources !== "false",
        buttonText: item.dataset.buttonText || "",
        buttonUrl: item.dataset.buttonUrl || "",
        status: item.dataset.status || (item.classList.contains("is-live") ? "live" : item.classList.contains("is-complete") ? "complete" : "upcoming")
      };
      let trigger = item.querySelector(".agenda-speaker-trigger");
      if (session.showSessionDetails) {
        if (!trigger) {
          trigger = document.createElement("button");
          trigger.type = "button";
          trigger.className = "agenda-speaker-trigger";
          item.querySelector(".agenda-card-main")?.append(trigger);
        }
        trigger.textContent = session.speaker ? "Meet the speaker" : "Session details";
        trigger.onclick = () => openSpeakerDetails(key);
      } else if (trigger) {
        trigger.remove();
      }
      return [key, session];
    }));
  }

  function createSessionIcon(iconKey) {
    const paths = sessionIconPaths[iconKey];
    if (!paths) return null;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.classList.add("agenda-session-icon");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    paths.forEach(pathData => {
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", pathData);
      svg.append(path);
    });
    return svg;
  }

  function ensureSessionIconStyles() {
    if (document.getElementById("agendaSessionIconStyles")) return;
    const style = document.createElement("style");
    style.id = "agendaSessionIconStyles";
    style.textContent = `
      .agenda-title-row { display: flex; align-items: center; gap: 10px; margin-top: 5px; }
      .agenda-title-row h3 { margin: 0; }
      .agenda-session-icon { flex: 0 0 auto; width: 28px; height: 28px; padding: 5px; border-radius: 8px; color: var(--jnj-red-dark); background: rgba(235,23,0,.08); fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
      .agenda-item.is-complete .agenda-session-icon { color: var(--muted); background: rgba(67,80,95,.07); }
    `;
    document.head.append(style);
  }

  function normalizeAgenda(raw) {
    const candidate = firstValue(raw.visible_agenda, raw.agenda_items, raw.agenda, raw.sessions, raw.event?.agenda);
    const list = Array.isArray(candidate) ? candidate : candidate?.items;
    if (!Array.isArray(list)) return null;
    return list.filter(item => item && item.visible !== false && item.is_visible !== false).map((item, index) => ({
      key: sessionKey(item) || `session-${index + 1}`,
      title: firstValue(item.title, item.name, item.session_name, "Session"),
      kicker: firstValue(item.kicker, item.type, item.category, "Program session"),
      start: firstValue(item.start_at, item.start_time, item.start),
      end: firstValue(item.end_at, item.end_time, item.end),
      iconKey: firstValue(item.icon_key, item.iconKey, ""),
      description: firstValue(item.description, item.summary, ""),
      speaker: firstValue(item.speaker?.name, item.speaker_name, typeof item.speaker === "string" ? item.speaker : "", ""),
      speakerRole: firstValue(item.speaker?.title, item.speaker?.role, item.speaker_title, item.speaker_role, ""),
      speakerBio: firstValue(item.speaker?.bio, item.speaker_bio, item.bio, ""),
      speakerPhoto: firstValue(item.speaker?.photo_url, item.speaker?.image_url, item.speaker_photo_url, item.photo_url, ""),
      showSessionDetails: item.show_session_details !== false && item.showSessionDetails !== false,
      showSpeakerPhoto: item.show_speaker_photo !== false && item.showSpeakerPhoto !== false,
      resources: normalizeResources(item.resources),
      showResources: item.show_resources !== false && item.showResources !== false,
      buttonText: firstValue(item.button_text, item.buttonText, ""),
      buttonUrl: firstValue(item.button_url, item.buttonUrl, ""),
      status: String(firstValue(item.status, "upcoming")).toLowerCase()
    }));
  }

  function renderAgenda(agenda) {
    if (!agendaList || !agenda?.length) return;
    const fragment = document.createDocumentFragment();
    agenda.forEach((session, index) => {
      const item = document.createElement("li");
      item.className = "agenda-item";
      item.dataset.session = session.key;
      item.dataset.start = session.start || "";
      item.dataset.end = session.end || "";
      item.dataset.status = session.status || "upcoming";
      item.dataset.description = session.description || "";
      item.dataset.speaker = session.speaker || "";
      item.dataset.speakerRole = session.speakerRole || "";
      item.dataset.speakerBio = session.speakerBio || "";
      item.dataset.speakerPhoto = session.speakerPhoto || "";
      item.dataset.showSessionDetails = String(session.showSessionDetails !== false);
      item.dataset.showSpeakerPhoto = String(session.showSpeakerPhoto !== false);
      item.dataset.resources = JSON.stringify(session.resources || []);
      item.dataset.showResources = String(session.showResources !== false);
      item.dataset.buttonText = session.buttonText || "";
      item.dataset.buttonUrl = session.buttonUrl || "";

      const time = document.createElement("div");
      time.className = "agenda-time";
      const start = document.createElement("span");
      const end = document.createElement("small");
      start.textContent = formatRuntimeTime(session.start);
      end.textContent = formatRuntimeTime(session.end);
      time.append(start, end);

      const track = document.createElement("div");
      track.className = "agenda-track";
      const node = document.createElement("span");
      node.className = "agenda-node";
      track.append(node);
      if (index < agenda.length - 1) {
        const line = document.createElement("span");
        line.className = "agenda-line";
        track.append(line);
      }

      const card = document.createElement("div");
      card.className = "agenda-card";
      const main = document.createElement("div");
      main.className = "agenda-card-main";
      const kicker = document.createElement("span");
      kicker.className = "agenda-kicker";
      kicker.textContent = session.kicker;
      const title = document.createElement("h3");
      title.textContent = session.title;
      const titleRow = document.createElement("div");
      titleRow.className = "agenda-title-row";
      const icon = createSessionIcon(session.iconKey);
      if (icon) titleRow.append(icon);
      titleRow.append(title);
      const durationText = formatSessionDuration(session.start, session.end);
      const duration = document.createElement("span");
      duration.className = "agenda-duration";
      duration.textContent = durationText;
      duration.hidden = !durationText;
      const resources = document.createElement("details");
      resources.className = "agenda-resources";
      resources.hidden = session.showResources === false || !session.resources?.length;
      const resourceSummary = document.createElement("summary");
      resourceSummary.textContent = `Download resources (${session.resources?.length || 0})`;
      const resourceList = document.createElement("div");
      resourceList.className = "agenda-resource-list";
      (session.resources || []).forEach(resource => {
        const link = document.createElement("a");
        link.href = resource.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = resource.label;
        link.title = resource.fileName;
        resourceList.append(link);
      });
      resources.append(resourceSummary, resourceList);
      const status = document.createElement("span");
      status.className = "agenda-state";
      status.textContent = "Upcoming";
      main.append(kicker, titleRow, duration, resources);
      card.append(main, status);
      item.append(time, track, card);
      fragment.append(item);
    });
    agendaList.replaceChildren(fragment);
    if (els.speakerPanel) els.speakerPanel.hidden = true;
    refreshAgendaIndex();
  }

  function speakerInitials(name) {
    const parts = String(name || "POA").trim().split(/\s+/).filter(Boolean);
    return parts.slice(0, 2).map(part => part[0]).join("").toUpperCase() || "POA";
  }

  function openSpeakerDetails(key) {
    const session = sessionMap.get(key);
    if (!session || !session.showSessionDetails || !els.speakerPanel) return;
    const hasSpeaker = Boolean(session.speaker);
    els.speakerPanel.hidden = false;
    els.speakerPanelLabel.textContent = hasSpeaker ? "Meet the speaker" : "Session details";
    els.speakerName.textContent = session.speaker || "Speaker details coming soon";
    els.speakerRole.textContent = session.speakerRole || "";
    els.speakerRole.hidden = !session.speakerRole;
    els.speakerBio.textContent = session.speakerBio || (hasSpeaker
      ? "A full speaker biography will be available here soon."
      : "Speaker information and a session overview will appear here when they are added in Jupiter.");
    els.speakerSession.textContent = session.name;
    els.speakerTime.textContent = session.displayTime;
    els.speakerInitials.textContent = speakerInitials(session.speaker);
    const showPortrait = session.showSpeakerPhoto !== false;
    if (els.speakerPortrait) els.speakerPortrait.hidden = !showPortrait;
    const validPhoto = showPortrait && /^https:\/\//i.test(session.speakerPhoto || "");
    els.speakerPhoto.hidden = !validPhoto;
    els.speakerInitials.hidden = validPhoto;
    if (validPhoto) {
      els.speakerPhoto.src = session.speakerPhoto;
      els.speakerPhoto.alt = session.speaker ? `${session.speaker}, speaker` : "Session speaker";
    } else {
      els.speakerPhoto.removeAttribute("src");
      els.speakerPhoto.alt = "";
    }
    agendaItems.forEach(item => item.classList.toggle("is-selected", item.dataset.session === key));
    if (window.matchMedia("(max-width: 820px)").matches) {
      els.speakerPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  function normalizeState(payload) {
    const raw = payload?.data?.runtime || payload?.data || payload?.runtime || payload;
    if (!raw || typeof raw !== "object") return null;
    const hasCurrentSession = ["current_session", "active_session", "live_session"]
      .some(key => Object.prototype.hasOwnProperty.call(raw, key));
    const current = firstValue(raw.current_session, raw.active_session, raw.live_session);
    const next = firstValue(raw.next_session, raw.up_next);
    const button = firstValue(raw.enter_button, raw.button, raw.cta, {});
    const announcements = firstValue(raw.announcements, raw.announcement, raw.notice);
    const latestAnnouncement = Array.isArray(announcements) ? announcements.find(item => item?.visible !== false) : announcements;
    const hasEventDescription = raw.event && typeof raw.event === "object" &&
      Object.prototype.hasOwnProperty.call(raw.event, "description");

    const agenda = normalizeAgenda(raw);
    return {
      sync_token: firstValue(raw.sync_token, raw.updated_at, payload?.sync_token),
      event_title: firstValue(raw.event?.title, raw.event_title, state.event_title),
      event_description: hasEventDescription ? String(raw.event.description || "") : firstValue(raw.event_description, state.event_description),
      agenda,
      active_session: hasCurrentSession ? sessionKey(current) : state.active_session,
      current_session: hasCurrentSession && typeof current === "object" ? current : null,
      next_session: typeof next === "object" ? next : null,
      event_date: firstValue(agenda?.[0]?.start, raw.event?.start_at, raw.event_start_at, state.event_date, config.EVENT_DATE),
      survey_url: firstValue(raw.survey_url, raw.survey?.url, ""),
      show_survey: raw.show_survey === true || raw.survey?.visible === true,
      button_text: firstValue(raw.button_text, button?.text, button?.label, state.button_text),
      button_url: firstValue(raw.button_url, button?.url, button?.href, state.button_url),
      announcement: typeof latestAnnouncement === "string" ? latestAnnouncement : firstValue(latestAnnouncement?.message, latestAnnouncement?.text, latestAnnouncement?.title, ""),
      status: firstValue(raw.status, raw.event_status, raw.mode, state.status, "closed")
    };
  }

  function findSession(reference) {
    if (reference === null || reference === undefined) return null;
    const key = sessionKey(reference);
    if (key && sessionMap.has(key)) return sessionMap.get(key);
    const title = typeof reference === "object" ? firstValue(reference.title, reference.name, reference.session_name) : null;
    if (title) return Array.from(sessionMap.values()).find(item => item.name === title);
    return null;
  }

  function resolveDisplaySessions() {
    const sessions = Array.from(sessionMap.values());
    const now = new Date();
    const timedActive = sessions.find(session => {
      const start = eventMoment(session.start);
      const end = eventMoment(session.end);
      return start && end && start <= now && end > now && !["complete", "cancelled"].includes(session.status);
    }) || null;
    const explicitNext = findSession(state.next_session);
    const futureSessions = sessions.filter(session => {
      const start = eventMoment(session.start);
      return start && start > now && !["complete", "cancelled"].includes(session.status);
    });
    const active = findSession(state.current_session) || findSession(state.active_session) || sessions.find(session => session.status === "live") || timedActive;
    const usableExplicitNext = explicitNext && (!eventMoment(explicitNext.end) || eventMoment(explicitNext.end) > now) ? explicitNext : null;
    const primary = active || usableExplicitNext || futureSessions[0] || sessions.find(session => session.status === "upcoming") || sessions[0] || null;
    let secondary = findSession(state.next_session);
    if (secondary?.key === primary?.key) secondary = null;
    if (secondary && eventMoment(secondary.end) && eventMoment(secondary.end) <= now) secondary = null;
    secondary ||= futureSessions.find(session => session.index > (primary?.index ?? -1) && session.key !== primary?.key);
    secondary ||= futureSessions.find(session => session.key !== primary?.key);
    return { active, primary, secondary };
  }

  function displayStatus(session, active, now = new Date()) {
    if (!session) return "upcoming";
    if (["complete", "cancelled"].includes(session.status)) return session.status;
    if (active?.key === session.key) return "live";
    const end = eventMoment(session.end);
    return end && end <= now ? "complete" : session.status === "live" ? "upcoming" : session.status || "upcoming";
  }

  function animateUpdate() {
    document.body.classList.remove("runtime-updated");
    void document.body.offsetWidth;
    document.body.classList.add("runtime-updated");
    window.setTimeout(() => document.body.classList.remove("runtime-updated"), 650);
  }

  function applyEventAccess(status) {
    const normalized = String(status || "closed").toLowerCase().replace(/\s+/g, "_");
    const isOpen = ["open", "live", "in_progress", "in-progress", "started", "running"].includes(normalized);
    document.body.classList.toggle("event-is-closed", !isOpen);
    if (els.eventGate) els.eventGate.hidden = isOpen;
  }

  function applySurvey(showSurvey, surveyUrl) {
    const validUrl = /^https:\/\//i.test(surveyUrl || "");
    const visible = showSurvey === true && validUrl;
    document.body.classList.toggle("survey-is-visible", visible);
    if (els.surveyPage) els.surveyPage.hidden = !visible;
    if (!els.surveyFrame || !els.surveyExternalLink) return;
    if (visible) {
      if (els.surveyFrame.src !== surveyUrl) els.surveyFrame.src = surveyUrl;
      els.surveyExternalLink.href = surveyUrl;
    } else {
      els.surveyFrame.removeAttribute("src");
      els.surveyExternalLink.href = "#";
    }
  }

  function applyState(nextState, animate = false) {
    if (!nextState) return;
    state = { ...state, ...nextState };
    if (state.event_title) {
      if (els.eventTitle) els.eventTitle.textContent = state.event_title;
      if (els.eventGateTitle) els.eventGateTitle.textContent = state.event_title;
      document.title = state.event_title;
    }
    if (els.eventDescription && typeof state.event_description === "string") {
      els.eventDescription.textContent = state.event_description;
      els.eventDescription.hidden = !state.event_description.trim();
    }
    applyEventAccess(state.status);
    applySurvey(state.show_survey, state.survey_url);
    if (nextState.agenda?.length) renderAgenda(nextState.agenda);

    const { active, primary, secondary } = resolveDisplaySessions();
    const sessionStatusNow = new Date();
    agendaItems.forEach(item => {
      const session = sessionMap.get(item.dataset.session);
      const status = displayStatus(session, active, sessionStatusNow);
      item.classList.toggle("is-live", status === "live");
      item.classList.toggle("is-complete", status === "complete" || status === "cancelled");
      const label = item.querySelector(".agenda-state");
      if (label) label.textContent = status === "live" ? "Live now" : status === "complete" ? "Complete" : status === "cancelled" ? "Cancelled" : "Upcoming";
    });

    if (els.liveLabel) els.liveLabel.textContent = active ? "Live now" : "Up next";
    if (primary) {
      els.liveSessionName.textContent = primary.name;
      els.liveSessionTime.textContent = primary.displayTime;
    }
    if (secondary) {
      els.nextUp.hidden = false;
      els.nextSessionName.textContent = secondary.name;
      els.nextSessionTime.textContent = secondary.displayTime;
    } else {
      els.nextUp.hidden = true;
    }

    const primaryRuntimeSession = active ? state.current_session : state.next_session;
    const meetingButtonUrl = firstValue(
      active?.buttonUrl,
      primary?.buttonUrl,
      primaryRuntimeSession?.button_url,
      state.button_url,
      els.enterButton?.href
    );
    const meetingButtonText = firstValue(
      active?.buttonText,
      primary?.buttonText,
      primaryRuntimeSession?.button_text,
      state.button_text,
      "Enter live meeting"
    );
    if (els.enterButton && meetingButtonUrl) els.enterButton.href = meetingButtonUrl;
    if (els.enterButtonText) els.enterButtonText.textContent = meetingButtonText;
    updateMeetingProvider(meetingButtonUrl || "");
    if (els.announcement && els.announcementText) {
      els.announcement.hidden = !state.announcement;
      els.announcementText.textContent = state.announcement || "";
    }
    if (els.statusPill) {
      const text = state.status === "complete" || state.status === "ended" ? "Event complete" : state.status === "scheduled" ? "Event begins soon" : "Event in progress";
      const textNode = Array.from(els.statusPill.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
      if (textNode) textNode.textContent = ` ${text}`;
    }
    updateEventDayDate(state.event_date);
    updateCountdown();
    if (animate) animateUpdate();
  }

  function updateClock() {
    const now = new Date();
    els.eventClock.textContent = new Intl.DateTimeFormat("en-US", { timeZone: config.TIME_ZONE || "America/New_York", hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true }).format(now);
    els.eventDate.textContent = new Intl.DateTimeFormat("en-US", { timeZone: config.TIME_ZONE || "America/New_York", weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(now);
  }

  function updateEventDayDate(value = state.event_date || config.EVENT_DATE) {
    if (!els.eventDayDate || !value) return;
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
    const eventDate = dateOnly ? new Date(`${value}T12:00:00Z`) : new Date(value);
    if (Number.isNaN(eventDate.getTime())) return;
    els.eventDayDate.textContent = `• ${new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: dateOnly ? "UTC" : config.TIME_ZONE || "America/New_York"
    }).format(eventDate)}`;
  }

  function eventMoment(time) {
    if (!time) return null;
    if (!/^\d{1,2}:\d{2}/.test(time)) {
      const date = new Date(time);
      return Number.isNaN(date.getTime()) ? null : date;
    }
    const fallbackDate = String(state.event_date || config.EVENT_DATE || "").slice(0, 10);
    if (!fallbackDate) return null;
    const [year, month, day] = fallbackDate.split("-").map(Number);
    const [hour, minute] = time.split(":").map(Number);
    const offsetHours = Number(config.EVENT_UTC_OFFSET_HOURS ?? 4);
    return new Date(Date.UTC(year, month - 1, day, hour + offsetHours, minute, 0));
  }

  function formatDuration(milliseconds) {
    const total = Math.max(0, Math.floor(milliseconds / 1000));
    return [Math.floor(total / 3600), Math.floor((total % 3600) / 60), total % 60].map(value => String(value).padStart(2, "0")).join(":");
  }

  function updateCountdown() {
    const { active, primary, secondary } = resolveDisplaySessions();
    const next = active ? secondary : primary;
    const now = new Date();
    if (els.liveLabel) els.liveLabel.textContent = active ? "Live now" : "Up next";
    if (primary) {
      els.liveSessionName.textContent = primary.name;
      els.liveSessionTime.textContent = primary.displayTime;
    }
    if (secondary) {
      els.nextUp.hidden = false;
      els.nextSessionName.textContent = secondary.name;
      els.nextSessionTime.textContent = secondary.displayTime;
    } else {
      els.nextUp.hidden = true;
    }
    agendaItems.forEach(item => {
      const session = sessionMap.get(item.dataset.session);
      const status = displayStatus(session, active, now);
      item.classList.toggle("is-live", status === "live");
      item.classList.toggle("is-complete", status === "complete" || status === "cancelled");
      const label = item.querySelector(".agenda-state");
      if (label) label.textContent = status === "live" ? "Live now" : status === "complete" ? "Complete" : status === "cancelled" ? "Cancelled" : "Upcoming";
    });
    if (next) {
      const nextStart = eventMoment(next.start);
      els.countdownLabel.textContent = "Next session begins in";
      els.countdownSession.textContent = next.name;
      els.countdownValue.textContent = nextStart && nextStart > now ? formatDuration(nextStart - now) : "Starting soon";
    } else {
      const activeEnd = eventMoment((active || primary)?.end);
      els.countdownLabel.textContent = "Program status";
      els.countdownSession.textContent = "Day One";
      els.countdownValue.textContent = activeEnd && activeEnd > now ? formatDuration(activeEnd - now) : "Complete";
    }
  }

  async function fetchState() {
    if (!config.STATE_ENDPOINT || requestInFlight) return;
    requestInFlight = true;
    try {
      const response = await fetch(config.STATE_ENDPOINT, { method: "GET", headers: { Accept: "application/json" }, cache: "no-store" });
      if (!response.ok) throw new Error(`Runtime endpoint returned ${response.status}`);
      const nextState = normalizeState(await response.json());
      if (!nextState) return;
      const token = nextState.sync_token || JSON.stringify(nextState);
      if (token === lastSyncToken) return;
      const isUpdate = lastSyncToken !== null;
      applyState(nextState, isUpdate);
      lastSyncToken = token;
    } catch (error) {
      console.warn("Unable to refresh Jupiter runtime. Continuing with the last known state.", error);
    } finally {
      requestInFlight = false;
    }
  }

  document.getElementById("openSupport")?.addEventListener("click", event => {
    event.preventDefault();
    window.$crisp = window.$crisp || [];
    window.$crisp.push(["do", "chat:show"]);
    window.$crisp.push(["do", "chat:open"]);
  });
  window.$crisp = window.$crisp || [];
  window.$crisp.push(["on", "chat:closed", () => window.$crisp.push(["do", "chat:hide"])]);

  els.speakerPanelClose?.addEventListener("click", () => {
    els.speakerPanel.hidden = true;
    agendaItems.forEach(item => item.classList.remove("is-selected"));
  });

  ensureSessionIconStyles();
  refreshAgendaIndex();
  applyState(state);
  updateEventDayDate();
  updateClock();
  setInterval(updateClock, 1000);
  setInterval(updateCountdown, 1000);
  fetchState();
  setInterval(fetchState, Math.max(10000, Number(config.POLL_INTERVAL_MS) || 10000));
})();
