'use strict';

/**
 * recallMemory.js — Memory recall tool for the Agent Execution Pipeline
 *
 * Bridges to the Cognitive Memory Substrate module.
 * Allows Claude to explicitly query the dual-layer memory store.
 */

const path           = require('path');
const SUBSTRATE_PATH = path.resolve(__dirname, '../../../Cogntive Memory Substrate');
const memoryManager  = require(path.join(SUBSTRATE_PATH, 'src/memoryManager'));

module.exports = {
  name: 'recallMemory',

  description: `Search the persistent memory store for facts, preferences, or information relevant to a query.
Use this tool when:
  - You need to recall something the user told you in a previous session
  - The user asks "do you remember when I told you X?"
  - You want to check what you know about the user before answering
  - You need to look up a specific preference or setting
  - Any question that might be answered by prior stored knowledge

Searches both semantic vector store (ChromaDB) and structured fact store (SQLite),
then merges and ranks results by relevance.`,

  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description:
          'A natural language description of what you want to recall. ' +
          'Examples: "user\'s name", "preferred programming language", "current project"',
      },
      category: {
        type: 'string',
        enum: ['personal', 'preference', 'project', 'technical', 'goal', 'entity', 'general'],
        description: 'Optional: narrow results to a specific category.',
      },
      topK: {
        type: 'number',
        description: 'Maximum number of results to return (default: 5).',
      },
    },
    required: ['query'],
  },

  async execute({ query, category, topK = 5 }) {
    try {
      const results = await memoryManager.recall(query, { topK, category });

      if (results.length === 0) {
        return `No memories found matching: "${query}". Nothing has been stored about this yet.`;
      }

      const lines = [`Found ${results.length} relevant memory(ies) for: "${query}"`, ''];
      for (const r of results) {
        const pct  = Math.round(r.score * 100);
        lines.push(`• [${r.category}] ${r.key}: ${r.value}`);
        lines.push(`  Relevance: ${pct}%  Source: ${r.source}`);
        lines.push('');
      }
      return lines.join('\n').trim();
    } catch (err) {
      return `❌ Memory recall failed: ${err.message}`;
    }
  },
};
