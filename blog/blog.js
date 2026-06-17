(function () {
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

  function formatMeta(post) {
    const parts = [post.readTime, post.author].filter(Boolean);
    return parts.join(" · ");
  }

  function renderPostList(posts, container) {
    container.replaceChildren();

    if (!posts.length) {
      const empty = document.createElement("p");
      empty.className = "entry-detail oss-empty";
      empty.textContent = "No posts yet.";
      container.appendChild(empty);
      return;
    }

    for (const post of posts) {
      const article = document.createElement("article");
      article.className = "entry blog-card";
      article.innerHTML = `
        <div class="entry-header">
          <h2 class="entry-title">
            <a href="post.html?slug=${encodeURIComponent(post.slug)}">${post.title}</a>
          </h2>
          <span class="entry-meta">${post.readTime || ""}</span>
        </div>
        <p class="entry-detail">${post.excerpt}</p>
      `;
      container.appendChild(article);
    }
  }

  async function loadPostIndex() {
    const container = document.getElementById("blog-list");
    if (!container) return;

    try {
      const res = await fetch("posts.json", { cache: "no-cache" });
      if (!res.ok) throw new Error(`posts.json ${res.status}`);
      const data = await res.json();
      renderPostList(data.posts || [], container);
    } catch (err) {
      container.replaceChildren();
      const errEl = document.createElement("p");
      errEl.className = "entry-detail oss-empty";
      errEl.textContent = "Could not load blog posts.";
      container.appendChild(errEl);
      console.warn("Blog index failed:", err);
    }
  }

  async function loadPostPage() {
    const titleEl = document.getElementById("post-title");
    const metaEl = document.getElementById("post-meta");
    const bodyEl = document.getElementById("post-body");
    if (!titleEl || !metaEl || !bodyEl) return;

    const slug = new URLSearchParams(window.location.search).get("slug");
    if (!slug) {
      titleEl.textContent = "Post not found";
      return;
    }

    try {
      const res = await fetch(`posts/${encodeURIComponent(slug)}.md`, { cache: "no-cache" });
      if (!res.ok) throw new Error(`post ${res.status}`);
      const raw = await res.text();
      const { meta, body } = parseFrontmatter(raw);

      titleEl.textContent = meta.title || slug;
      metaEl.textContent = [meta.readTime, meta.author || "alanturrr1703"]
        .filter(Boolean)
        .join(" · ");

      document.title = `${meta.title || slug} · Blog`;

      const desc = meta.excerpt || "";
      if (desc) {
        let tag = document.querySelector('meta[name="description"]');
        if (tag) tag.setAttribute("content", desc);
      }

      bodyEl.innerHTML = marked.parse(body);
    } catch (err) {
      titleEl.textContent = "Post not found";
      metaEl.textContent = "";
      bodyEl.replaceChildren();
      const errEl = document.createElement("p");
      errEl.className = "entry-detail";
      errEl.textContent = "This post could not be loaded.";
      bodyEl.appendChild(errEl);
      console.warn("Blog post failed:", err);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("blog-list")) loadPostIndex();
    if (document.getElementById("post-body")) loadPostPage();
  });
})();
