'use strict';

/**
 * webSearch tool — Phase 1: Mock implementation (Option C)
 *
 * Returns realistic-looking mock search results without making any
 * external HTTP requests. This lets the full agent loop be validated
 * end-to-end offline.
 *
 * Phase 2 (future): Replace mockSearch() with a real Brave Search API
 * call. Only this file changes — the ToolRegistry and AgentRunner are
 * completely unaffected.
 *
 * To enable real search:
 *   1. Set BRAVE_API_KEY in .env
 *   2. Uncomment the realSearch() function below
 *   3. Replace mockSearch() with realSearch() in execute()
 */

// ---------------------------------------------------------------------------
// Mock search data — covers a range of common query types
// ---------------------------------------------------------------------------
const MOCK_RESULTS = [
  {
    keywords: ['node', 'nodejs', 'node.js', 'lts'],
    results: [
      {
        title: 'Node.js — Download',
        snippet: 'The current LTS version of Node.js is v22.x (Jod). LTS releases receive long-term support for 30 months.',
        url: 'https://nodejs.org/en/download',
      },
      {
        title: 'Node.js Release Schedule',
        snippet: 'Even-numbered releases become LTS. Node.js v22 entered LTS on 2024-10-29.',
        url: 'https://nodejs.org/en/about/previous-releases',
      },
    ],
  },
  {
    keywords: ['capital', 'france', 'paris'],
    results: [
      {
        title: 'France — Wikipedia',
        snippet: 'Paris is the capital and largest city of France, with a population of over 2 million in the city proper.',
        url: 'https://en.wikipedia.org/wiki/France',
      },
    ],
  },
  {
    keywords: ['anthropic', 'claude', 'ai'],
    results: [
      {
        title: 'Anthropic — Claude AI',
        snippet: 'Claude is Anthropic\'s AI assistant. The latest models include Claude 3.5 Sonnet and Claude 3.5 Haiku.',
        url: 'https://www.anthropic.com/claude',
      },
      {
        title: 'Claude API Docs',
        snippet: 'Anthropic\'s API supports tool use (function calling), vision, and multi-turn conversations.',
        url: 'https://docs.anthropic.com',
      },
    ],
  },
  {
    keywords: ['python', 'programming', 'language'],
    results: [
      {
        title: 'Python.org',
        snippet: 'Python 3.13 is the latest stable release. Python is a versatile, high-level programming language emphasizing readability.',
        url: 'https://www.python.org',
      },
    ],
  },
  {
    keywords: ['openclaw', 'open claw'],
    results: [
      {
        title: 'OpenClaw — Agentic Framework',
        snippet: 'OpenClaw is a modular AI agent framework by Tejas Singh Bhati, built on top of Anthropic\'s Claude with a dynamic plugin system.',
        url: 'https://github.com/tejassinghbhati/openclaw',
      },
    ],
  },
];

const FALLBACK_RESULT = [
  {
    title: 'Search Result (Mock)',
    snippet: 'This is a simulated search result. Real web search is not yet enabled. ' +
      'To enable real results, configure the Brave Search API key in .env.',
    url: 'https://example.com',
  },
];

// ---------------------------------------------------------------------------
// Core mock logic
// ---------------------------------------------------------------------------

/**
 * Finds the best matching mock result set for a given query.
 * @param {string} query
 */
function mockSearch(query) {
  const q = query.toLowerCase();

  for (const entry of MOCK_RESULTS) {
    if (entry.keywords.some((kw) => q.includes(kw))) {
      return entry.results;
    }
  }

  return FALLBACK_RESULT;
}

/**
 * Formats an array of result objects into a human-readable string
 * the LLM can incorporate into its final answer.
 * @param {Array<{title: string, snippet: string, url: string}>} results
 */
function formatResults(results) {
  return results
    .map(
      (r, i) =>
        `[${i + 1}] ${r.title}\n    ${r.snippet}\n    Source: ${r.url}`
    )
    .join('\n\n');
}

// ---------------------------------------------------------------------------
// Tool definition
// ---------------------------------------------------------------------------

const webSearch = {
  name: 'webSearch',

  description:
    'Searches the web for current information and returns a list of relevant results. ' +
    'Use this tool for factual questions about current events, technical topics, ' +
    'definitions, or anything that requires up-to-date information from the internet.',

  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query to look up, e.g. "latest Node.js LTS version"',
      },
    },
    required: ['query'],
  },

  /**
   * @param {{ query: string }} args
   * @returns {Promise<string>}
   */
  async execute({ query }) {
    try {
      // Phase 1: Mock implementation
      const results = mockSearch(query);
      const formatted = formatResults(results);

      return (
        `[MOCK SEARCH — Real web search not yet enabled]\n` +
        `Query: "${query}"\n\n` +
        formatted
      );

      /*
       * Phase 2 — Real Brave Search (uncomment when ready):
       *
       * const results = await realSearch(query);
       * return formatResults(results);
       */
    } catch (err) {
      return `Search failed for query "${query}": ${err.message}`;
    }
  },
};

module.exports = webSearch;

// ---------------------------------------------------------------------------
// Phase 2 stub — real Brave Search implementation (currently inactive)
// ---------------------------------------------------------------------------

/*
async function realSearch(query) {
  const BRAVE_KEY = process.env.BRAVE_API_KEY;
  if (!BRAVE_KEY) throw new Error('BRAVE_API_KEY not set in .env');

  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=3`;
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': BRAVE_KEY,
    },
  });

  if (!response.ok) throw new Error(`Brave API error: ${response.status} ${response.statusText}`);
  const data = await response.json();

  return (data.web?.results ?? []).slice(0, 3).map((r) => ({
    title: r.title,
    snippet: r.description,
    url: r.url,
  }));
}
*/
