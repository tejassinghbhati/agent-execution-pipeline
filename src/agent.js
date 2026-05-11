'use strict';

require('dotenv').config();
const path      = require('path');
const Anthropic = require('@anthropic-ai/sdk');
const { v4: uuidv4 } = require('uuid');
const { getToolSchemas, dispatch, listTools } = require('./toolRegistry');

// Memory Substrate — loaded from sibling project directory
const SUBSTRATE_PATH = path.resolve(__dirname, '../../Cogntive Memory Substrate');
let memoryManager = null;
try {
  memoryManager = require(path.join(SUBSTRATE_PATH, 'src/memoryManager'));
} catch (_) {
  // Memory substrate not installed — agent runs without memory
  console.warn('\u26a0️  [Memory] Cognitive Memory Substrate not found. Running without persistent memory.');
  console.warn('   Install it: cd "Cogntive Memory Substrate" && npm install');
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const MODEL          = process.env.ANTHROPIC_MODEL    || 'claude-3-5-haiku-20241022';
const MAX_ITERATIONS = parseInt(process.env.AGENT_MAX_ITERATIONS || '5', 10);

// Validate API key early
if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your_anthropic_api_key_here') {
  console.error('\n❌  ANTHROPIC_API_KEY is not set.');
  console.error('    Open .env and replace "your_anthropic_api_key_here" with your real key.');
  console.error('    Get a key at: https://console.anthropic.com/\n');
  process.exit(1);
}

const client = new Anthropic();

// ---------------------------------------------------------------------------
// System prompt — tells Claude who it is and how to use tools
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `You are OpenClaw, an intelligent AI agent built by Tejas Singh Bhati.

You have access to the following tools:
- calculator: evaluate mathematical expressions
- fileReader: read local files from the data directory
- webSearch: search the web for current information

TOOL USE GUIDELINES:
- For any math calculation, ALWAYS use the calculator tool — do not compute in your head.
- For questions about file contents, ALWAYS use the fileReader tool.
- For factual questions about current events, technologies, or things you may not know, use webSearch.
- For simple greetings or questions you can answer from your training knowledge, respond directly without using tools.
- After receiving a tool result, compose a complete, helpful, and conversational answer for the user.

Always be concise but thorough. If a tool fails, explain why and suggest alternatives.`;

// ---------------------------------------------------------------------------
// Logger — prefixed console output for the orchestration loop
// ---------------------------------------------------------------------------
const log = {
  agent:  (msg) => console.log(`\n🤖 [Agent]     ${msg}`),
  tool:   (msg) => console.log(`🔧 [Tool Call] ${msg}`),
  result: (msg) => console.log(`📦 [Result]    ${msg}`),
  answer: (msg) => console.log(`\n✅ [Answer]\n${'─'.repeat(60)}\n${msg}\n${'─'.repeat(60)}`),
  warn:   (msg) => console.warn(`⚠️  [Warning]   ${msg}`),
  error:  (msg) => console.error(`❌ [Error]     ${msg}`),
};

// ---------------------------------------------------------------------------
// Core orchestration loop
// ---------------------------------------------------------------------------

/**
 * Runs the OpenClaw agent against a single user query.
 *
 * The loop:
 *   1. Injects relevant persistent memories into the system prompt.
 *   2. Sends the user message + tool schemas to Claude.
 *   3. If Claude returns a tool_use block → execute the tool → feed result back.
 *   4. If Claude returns a text block → return the final answer.
 *   5. Repeat up to MAX_ITERATIONS to support multi-step tool chains.
 *
 * @param {string} userMessage - The raw natural language input from the user
 * @param {string} [sessionId] - Session UUID for episodic memory grouping
 * @returns {Promise<string>} - The final composed answer
 */
async function runAgent(userMessage, sessionId = uuidv4()) {
  log.agent(`Processing: "${userMessage}"`);
  log.agent(`Tools available: [${listTools().join(', ')}]`);

  // ── Memory context injection ─────────────────────────────────────────────
  let dynamicSystemPrompt = SYSTEM_PROMPT;
  if (memoryManager) {
    try {
      const memContext = await memoryManager.injectContext(userMessage, sessionId);
      if (memContext.trim()) {
        dynamicSystemPrompt = SYSTEM_PROMPT + '\n' + memContext;
        log.agent('Memory context injected into system prompt.');
      }
    } catch (err) {
      log.warn(`Memory context injection failed: ${err.message}`);
    }

    // Log the user's turn to episodic store
    try {
      memoryManager.logConversation(sessionId, 'user', userMessage);
    } catch (_) {}
  }

  // Build the conversation history — starts with just the user message
  /** @type {Array<import('@anthropic-ai/sdk').MessageParam>} */
  const messages = [{ role: 'user', content: userMessage }];

  let iterations = 0;

  while (iterations < MAX_ITERATIONS) {
    iterations++;

    // -----------------------------------------------------------------------
    // Call Claude
    // -----------------------------------------------------------------------
    let response;
    try {
      response = await client.messages.create({
        model:      MODEL,
        max_tokens: 1024,
        system:     dynamicSystemPrompt,   // ← memory-enriched system prompt
        tools:      getToolSchemas(),
        messages,
      });
    } catch (err) {
      log.error(`Anthropic API error: ${err.message}`);
      throw err;
    }

    // -----------------------------------------------------------------------
    // Process Claude's response
    // -----------------------------------------------------------------------
    const { stop_reason, content } = response;

    // Add Claude's full response to the conversation history
    messages.push({ role: 'assistant', content });

    if (stop_reason === 'end_turn') {
      // Claude finished — extract the final text answer
      const textBlock = content.find((b) => b.type === 'text');
      const answer    = textBlock ? textBlock.text : '(No text response from model)';
      log.answer(answer);

      // Log the assistant's final response to episodic memory
      if (memoryManager) {
        try { memoryManager.logConversation(sessionId, 'assistant', answer); } catch (_) {}
      }

      return answer;
    }

    if (stop_reason === 'tool_use') {
      // Claude wants to use one or more tools
      // Build the tool_result blocks to send back
      const toolResultBlocks = [];

      for (const block of content) {
        if (block.type !== 'tool_use') continue;

        const { id: toolUseId, name: toolName, input: toolArgs } = block;

        log.tool(`${toolName}(${JSON.stringify(toolArgs)})`);

        // Execute the tool
        const toolResult = await dispatch(toolName, toolArgs);

        // Truncate result logging for readability
        const previewLen = 200;
        const preview = toolResult.length > previewLen
          ? toolResult.slice(0, previewLen) + '…'
          : toolResult;
        log.result(preview);

        toolResultBlocks.push({
          type:        'tool_result',
          tool_use_id: toolUseId,
          content:     toolResult,
        });
      }

      // Append tool results as a user turn (Anthropic's required format)
      messages.push({ role: 'user', content: toolResultBlocks });

      // Loop again — Claude will now compose a final answer
      continue;
    }

    // Unexpected stop reason
    log.warn(`Unexpected stop_reason: "${stop_reason}". Ending loop.`);
    break;
  }

  const fallback = `I was unable to complete your request within ${MAX_ITERATIONS} steps. Please try rephrasing your question.`;
  log.warn(`Max iterations (${MAX_ITERATIONS}) reached.`);
  return fallback;
}

module.exports = { runAgent };
