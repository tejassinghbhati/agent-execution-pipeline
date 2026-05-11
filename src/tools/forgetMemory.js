'use strict';

/**
 * forgetMemory.js — Memory deletion tool for the Agent Execution Pipeline
 *
 * Bridges to the Cognitive Memory Substrate module.
 * Allows Claude to delete a specific memory from both stores.
 */

const path           = require('path');
const SUBSTRATE_PATH = path.resolve(__dirname, '../../../Cogntive Memory Substrate');
const memoryManager  = require(path.join(SUBSTRATE_PATH, 'src/memoryManager'));

module.exports = {
  name: 'forgetMemory',

  description: `Delete a specific memory from persistent storage (both exact and semantic stores).
Use this tool when:
  - The user explicitly says "forget that" or "don't remember X"
  - The user corrects stored information (forget the old one, then remember the new one)
  - The user wants to clear a preference or fact
  - The user invokes their right to have data erased`,

  inputSchema: {
    type: 'object',
    properties: {
      key: {
        type: 'string',
        description:
          'The exact key of the fact to delete, e.g. "user.name", "preference.language". ' +
          'Use recallMemory first to confirm the exact key if unsure.',
      },
    },
    required: ['key'],
  },

  async execute({ key }) {
    try {
      const deleted = await memoryManager.forget(key);
      if (deleted) {
        return `🗑️  Memory deleted — "${key}" has been permanently removed from all stores.`;
      }
      return `No memory found with key "${key}". Nothing was deleted. Use recallMemory to find the correct key.`;
    } catch (err) {
      return `❌ Failed to delete memory "${key}": ${err.message}`;
    }
  },
};
