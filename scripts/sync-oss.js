#!/usr/bin/env node
/**
 * Fetches OSS pull requests from GitHub and writes oss-data.json.
 * Run before deploy: node scripts/sync-oss.js
 */

const fs = require("fs");
const path = require("path");

const USERNAME = "alanturrr-1703";
const EXCLUDED = ["hyperskill/", "mgav-uwb/", "microsoft/pylance-release"];
const OUT = path.join(__dirname, "..", "oss-data.json");

function repoFull(issue) {
  const parts = issue.repository_url.split("/");
  return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
}

async function fetchAllPullRequests(username) {
  const headers = { Accept: "application/vnd.github+json" };
  const query = `author:${username} type:pr is:public`;
  const all = [];
  let page = 1;

  while (page <= 10) {
    const url = `https://api.github.com/search/issues?q=${encodeURIComponent(query)}&sort=updated&order=desc&per_page=100&page=${page}`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);
    const data = await res.json();
    const items = data.items || [];
    all.push(...items);
    if (items.length < 100) break;
    page += 1;
  }

  return all;
}

async function main() {
  const raw = await fetchAllPullRequests(USERNAME);
  const seen = new Set();
  const issues = [];

  for (const issue of raw) {
    if (seen.has(issue.id)) continue;
    seen.add(issue.id);

    const full = repoFull(issue);
    if (full.startsWith(`${USERNAME}/`)) continue;
    if (EXCLUDED.some((p) => full.includes(p))) continue;

    issues.push({
      id: issue.id,
      number: issue.number,
      title: issue.title,
      state: issue.state,
      html_url: issue.html_url,
      updated_at: issue.updated_at,
      repository_url: issue.repository_url,
    });
  }

  const payload = { fetchedAt: new Date().toISOString(), issues };
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2) + "\n");
  console.log(`Wrote ${issues.length} PR(s) to ${OUT}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
