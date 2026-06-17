const PORTFOLIO_CONFIG = {
  githubUsername: "alanturrr-1703",

  // Repos to hide from the auto-synced OSS list (class repos, tutorials, etc.)
  excludedRepos: [
    "hyperskill/",
    "mgav-uwb/",
    "microsoft/pylance-release",
  ],

  // Manual entries for work in progress — remove when the PR lands on GitHub
  upcomingOss: [
    {
      name: "Netflix OSS",
      url: "https://netflix.github.io/",
      description:
        "Starting contributions to Netflix open source — distributed systems and platform reliability tooling.",
    },
    {
      name: "Tree-sitter Grammar",
      url: "https://tree-sitter.github.io/",
      description:
        "Building a Tree-sitter parser for a new programming language to enable fast, incremental static analysis.",
    },
  ],

  ossCacheTtlMs: 60 * 60 * 1000,
  ossRefreshIntervalMs: 30 * 60 * 1000,

  // Last-resort fallback when live sync and oss-data.json both fail (e.g. file://)
  ossFallback: [
    {
      id: 4671229289,
      number: 596,
      title: "Validate tasks.max is at least container count in source connector",
      state: "open",
      html_url: "https://github.com/microsoft/kafka-connect-cosmosdb/pull/596",
      updated_at: "2026-06-16T19:52:40Z",
      repository_url: "https://api.github.com/repos/microsoft/kafka-connect-cosmosdb",
    },
    {
      id: 4652893928,
      number: 8476,
      title: "Clarify AtomicDoubleArray get/set/lazySet Javadoc",
      state: "closed",
      html_url: "https://github.com/google/guava/pull/8476",
      updated_at: "2026-06-15T16:40:19Z",
      repository_url: "https://api.github.com/repos/google/guava",
    },
  ],
};
