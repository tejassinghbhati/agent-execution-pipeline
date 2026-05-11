'use strict';

/**
 * ToolRegistry
 *
 * Central registry for all OpenClaw tools. The AgentRunner asks this module
 * for two things:
 *   1. getToolSchemas()  — the JSON schemas sent to Claude so it knows what
 *                          tools are available and how to call them.
 *   2. dispatch(name, args) — routes a tool call from Claude to the correct
 *                             execute() function and returns the string result.
 *
 * To add a new tool: just require() it here and add it to the TOOLS array.
 * Nothing else in the codebase needs to change.
 */

const calculator    = require('./tools/calculator');
const fileReader    = require('./tools/fileReader');
const webSearch     = require('./tools/webSearch');
const rememberFact  = require('./tools/rememberFact');
const recallMemory  = require('./tools/recallMemory');
const forgetMemory  = require('./tools/forgetMemory');

// ---------------------------------------------------------------------------
// Tool registry — order determines priority in case of naming conflicts
// ---------------------------------------------------------------------------
const TOOLS = [calculator, fileReader, webSearch, rememberFact, recallMemory, forgetMemory];

// Build an O(1) lookup map: tool name → tool object
const TOOL_MAP = new Map(TOOLS.map((t) => [t.name, t]));

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the array of tool schemas in the format Anthropic's API expects.
 * Each schema includes name, description, and inputSchema (JSON Schema).
 *
 * @returns {Array<{name: string, description: string, input_schema: object}>}
 */
function getToolSchemas() {
  return TOOLS.map((tool) => ({
    name:         tool.name,
    description:  tool.description,
    input_schema: tool.inputSchema,   // Anthropic uses snake_case here
  }));
}

/**
 * Dispatches a tool call from Claude to the appropriate tool.
 *
 * @param {string} name   - The tool name Claude decided to call
 * @param {object} args   - The arguments Claude provided
 * @returns {Promise<string>} - The tool's result as a plain string
 */
async function dispatch(name, args) {
  const tool = TOOL_MAP.get(name);

  if (!tool) {
    return (
      `Unknown tool: "${name}". ` +
      `Available tools: ${Array.from(TOOL_MAP.keys()).join(', ')}.`
    );
  }

  try {
    const result = await tool.execute(args);
    return String(result);
  } catch (err) {
    return `Tool "${name}" threw an unexpected error: ${err.message}`;
  }
}

/**
 * Returns the list of registered tool names (for logging/debugging).
 * @returns {string[]}
 */
function listTools() {
  return Array.from(TOOL_MAP.keys());
}

module.exports = { getToolSchemas, dispatch, listTools };
