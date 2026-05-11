'use strict';

/**
 * rememberFact.js — Memory tool for the Agent Execution Pipeline
 *
 * Bridges to the Cognitive Memory Substrate module.
 * Allows Claude to save facts about the user to persistent storage.
 */

// Resolve path to Cognitive Memory Substrate (sibling project directory)
const path           = require('path');
const SUBSTRATE_PATH = path.resolve(__dirname, '../../../Cogntive Memory Substrate');
const memoryManager  = require(path.join(SUBSTRATE_PATH, 'src/memoryManager'));

module.exports = {
  name: 'rememberFact',

  description: `Save a fact, preference, or piece of information about the user to long-term persistent memory.
Use this tool when the user:
  - Shares personal information ("My name is X", "I live in Y")
  - States a preference ("I prefer TypeScript", "I like dark mode")
  - Mentions a project or goal ("I'm working on OpenClaw")
  - Asks you to remember something explicitly
  - Provides any detail that would be useful in future conversations

The memory persists across ALL sessions — the agent will recall it automatically in future conversations.
Categories: personal, preference, project, technical, goal, entity, general`,

  inputSchema: {
    type: 'object',
    properties: {
      key: {
        type: 'string',
        description:
          'A short normalised identifier for the fact. Use dot notation. ' +
          'Examples: "user.name", "preference.language", "project.current"',
      },
      value: {
        type: 'string',
        description: 'The value to store.',
      },
      category: {
        type: 'string',
        enum: ['personal', 'preference', 'project', 'technical', 'goal', 'entity', 'general'],
        description: 'Category label. Defaults to "general".',
      },
    },
    required: ['key', 'value'],
  },

  async execute({ key, value, category = 'general' }) {
    try {
      const id = await memoryManager.remember(key, value, { category });
      return `✅ Memory saved — "${key}": "${value}" [category: ${category}, id: ${id.slice(0, 8)}]`;
    } catch (err) {
      return `❌ Failed to save memory for key "${key}": ${err.message}`;
    }
  },
};
