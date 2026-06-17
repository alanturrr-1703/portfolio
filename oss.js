(function () {
  const CACHE_KEY = "portfolio_oss_contributions_v2";

  function canFetchLive() {
    return window.location.protocol === "http:" || window.location.protocol === "https:";
  }

  function repoFromIssue(issue) {
    const parts = issue.repository_url.split("/");
    const owner = parts[parts.length - 2];
    const name = parts[parts.length - 1];
    return { owner, name, full: `${owner}/${name}` };
  }

  function isExcluded(full) {
    if (full.startsWith(`${PORTFOLIO_CONFIG.githubUsername}/`)) return true;
    return PORTFOLIO_CONFIG.excludedRepos.some(
      (pattern) => full.includes(pattern) || full === pattern
    );
  }

  function prState(issue) {
    if (issue.state === "open") {
      return { label: "Open", className: "oss-state--open" };
    }
    if (issue.pull_request?.merged_at) {
      return { label: "Merged", className: "oss-state--merged" };
    }
    return { label: "Closed", className: "oss-state--closed" };
  }

  function formatRepoTitle(full) {
    const [owner, name] = full.split("/");
    const titled = name
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    if (owner === "google" || owner === "microsoft" || owner === "netflix") {
      return `${owner.charAt(0).toUpperCase() + owner.slice(1)} ${titled}`;
    }
    return `${owner}/${name}`;
  }

  function groupByRepo(issues) {
    const groups = new Map();

    for (const issue of issues) {
      const state = prState(issue);
      const repo = repoFromIssue(issue);
      if (isExcluded(repo.full)) continue;

      if (!groups.has(repo.full)) {
        groups.set(repo.full, {
          repo,
          prs: [],
          latestUpdate: issue.updated_at,
        });
      }

      const group = groups.get(repo.full);
      group.prs.push({ issue, state });
      if (issue.updated_at > group.latestUpdate) {
        group.latestUpdate = issue.updated_at;
      }
    }

    for (const group of groups.values()) {
      group.prs.sort(
        (a, b) => new Date(b.issue.updated_at) - new Date(a.issue.updated_at)
      );
    }

    return [...groups.values()].sort(
      (a, b) => new Date(b.latestUpdate) - new Date(a.latestUpdate)
    );
  }

  function readCache() {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const cached = JSON.parse(raw);
      if (Date.now() - cached.fetchedAt > PORTFOLIO_CONFIG.ossCacheTtlMs) return null;
      return cached;
    } catch {
      return null;
    }
  }

  function writeCache(issues) {
    try {
      sessionStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ fetchedAt: Date.now(), issues })
      );
    } catch {
      /* ignore quota errors */
    }
  }

  async function fetchBundledData() {
    const res = await fetch("oss-data.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(`bundled data ${res.status}`);
    const data = await res.json();
    return data.issues || [];
  }

  async function fetchPullRequests() {
    const username = PORTFOLIO_CONFIG.githubUsername;
    const headers = { Accept: "application/vnd.github+json" };
    const query = `author:${username} type:pr is:public`;
    const url = `https://api.github.com/search/issues?q=${encodeURIComponent(query)}&sort=updated&order=desc&per_page=100`;

    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);
    const data = await res.json();
    return data.items || [];
  }

  function renderContributions(listEl, issues) {
    const groups = groupByRepo(issues);
    listEl.replaceChildren();

    if (groups.length === 0) {
      const empty = document.createElement("p");
      empty.className = "entry-detail oss-empty";
      empty.textContent = "No open source pull requests found yet.";
      listEl.appendChild(empty);
      return;
    }

    for (const group of groups) {
      listEl.appendChild(renderContribution(group));
    }
  }

  function renderContribution(group) {
    const { repo, prs } = group;
    const repoUrl = `https://github.com/${repo.full}`;
    const prItems = prs
      .map(({ issue, state }) => {
        const num = issue.number;
        return `<li>
          <a href="${issue.html_url}" target="_blank" rel="noopener noreferrer">PR #${num}</a>
          <span class="oss-state ${state.className}">${state.label}</span> —
          ${issue.title}
        </li>`;
      })
      .join("");

    const article = document.createElement("article");
    article.className = "entry";
    article.innerHTML = `
      <div class="entry-header">
        <h3 class="entry-title">
          <a href="${repoUrl}" target="_blank" rel="noopener noreferrer">${formatRepoTitle(repo.full)}</a>
        </h3>
        <span class="entry-meta">${repo.full} · ${prs.length} PR${prs.length === 1 ? "" : "s"}</span>
      </div>
      <ul class="entry-list oss-pr-list">${prItems}</ul>
    `;
    return article;
  }

  function renderUpcoming(container) {
    const items = PORTFOLIO_CONFIG.upcomingOss;
    if (!items.length) return;

    const heading = document.createElement("h3");
    heading.className = "subsection-title";
    heading.textContent = "Upcoming";
    container.appendChild(heading);

    const list = document.createElement("div");
    list.className = "entries entries--compact";

    for (const item of items) {
      const article = document.createElement("article");
      article.className = "entry";
      const titleHtml = item.url
        ? `<a href="${item.url}" target="_blank" rel="noopener noreferrer">${item.name}</a>`
        : item.name;

      article.innerHTML = `
        <div class="entry-header">
          <h3 class="entry-title">${titleHtml}</h3>
          <span class="entry-meta">Upcoming</span>
        </div>
        <p class="entry-detail">${item.description}</p>
      `;
      list.appendChild(article);
    }

    container.appendChild(list);
  }

  function formatSyncedLabel(source) {
    const synced = new Date().toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    return `${source} · ${synced}`;
  }

  async function loadContributions({ force = false } = {}) {
    const listEl = document.getElementById("oss-contributions");
    const statusEl = document.getElementById("oss-status");
    if (!listEl) return;

    let issues = null;
    let source = "Synced from GitHub";

    if (!force) {
      const cached = readCache();
      if (cached) {
        issues = cached.issues;
        source = "Cached from GitHub";
      }
    }

    try {
      if (!issues && canFetchLive()) {
        try {
          issues = await fetchPullRequests();
          writeCache(issues);
          source = "Synced from GitHub";
        } catch (liveErr) {
          console.warn("Live GitHub sync failed, using bundled data:", liveErr);
          issues = await fetchBundledData();
          source = "Loaded from bundled data";
        }
      }

      if (!issues) {
        try {
          issues = await fetchBundledData();
          source = canFetchLive() ? "Loaded from bundled data" : "Loaded offline snapshot";
        } catch (bundledErr) {
          issues = PORTFOLIO_CONFIG.ossFallback || [];
          source = "Loaded from embedded snapshot";
          console.warn("Bundled OSS data unavailable:", bundledErr);
        }
      }

      renderContributions(listEl, issues);

      if (statusEl) {
        statusEl.textContent = formatSyncedLabel(source);
      }
    } catch (err) {
      listEl.replaceChildren();
      const errEl = document.createElement("p");
      errEl.className = "entry-detail oss-empty";
      errEl.innerHTML =
        'Could not load contributions. <a href="https://github.com/alanturrr-1703" target="_blank" rel="noopener noreferrer">View GitHub profile</a>.';
      listEl.appendChild(errEl);

      if (statusEl) statusEl.textContent = "Sync unavailable";
      console.warn("OSS load failed:", err);
    }

    const upcomingEl = document.getElementById("oss-upcoming");
    if (upcomingEl && !upcomingEl.childElementCount) {
      renderUpcoming(upcomingEl);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    loadContributions();

    if (canFetchLive()) {
      setInterval(() => loadContributions({ force: true }), PORTFOLIO_CONFIG.ossRefreshIntervalMs);

      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          loadContributions({ force: true });
        }
      });
    }
  });
})();
