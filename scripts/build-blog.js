#!/usr/bin/env node
/**
 * Scans blog/posts/*.md and writes blog/posts.json for the blog index.
 * Run after adding a new post: node scripts/build-blog.js
 */

const fs = require("fs");
const path = require("path");

const POSTS_DIR = path.join(__dirname, "..", "blog", "posts");
const OUT = path.join(__dirname, "..", "blog", "posts.json");

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { meta: {}, body: raw };

  const meta = {};
  for (const line of match[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    meta[key] = value;
  }

  return { meta, body: raw.slice(match[0].length) };
}

function formatDateLabel(dateStr) {
  const date = new Date(`${dateStr}T12:00:00`);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function main() {
  const files = fs
    .readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort();

  const posts = files.map((file) => {
    const slug = file.replace(/\.md$/, "");
    const raw = fs.readFileSync(path.join(POSTS_DIR, file), "utf8");
    const { meta } = parseFrontmatter(raw);

    return {
      slug,
      title: meta.title || slug,
      date: meta.date || "",
      dateLabel: meta.date ? formatDateLabel(meta.date) : "",
      readTime: meta.readTime || "",
      excerpt: meta.excerpt || "",
      author: meta.author || "alanturrr1703",
    };
  });

  posts.sort((a, b) => new Date(b.date) - new Date(a.date));

  fs.writeFileSync(OUT, JSON.stringify({ posts }, null, 2) + "\n");
  console.log(`Wrote ${posts.length} post(s) to blog/posts.json`);
}

main();
