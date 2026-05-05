'use strict';

require('dotenv').config();
const readline = require('readline');
const { runAgent } = require('./src/agent');

// ---------------------------------------------------------------------------
// Banner
// ---------------------------------------------------------------------------
function printBanner() {
  console.log('\n' + '═'.repeat(60));
  console.log('  🦀  OpenClaw — Agent Execution Pipeline');
  console.log('       Natural Language → Tool Use → Composed Answer');
  console.log('═'.repeat(60));
  console.log('  Model  : ' + (process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-20241022'));
  console.log('  Tools  : calculator · fileReader · webSearch (mock)');
  console.log('  Tip    : Type "examples" to see sample queries');
  console.log('  Tip    : Type "exit" or Ctrl+C to quit');
  console.log('═'.repeat(60) + '\n');
}

// ---------------------------------------------------------------------------
// Example queries shown on demand
// ---------------------------------------------------------------------------
const EXAMPLES = [
  '  📐 Math      →  "What is sqrt(1764) multiplied by 3?"',
  '  📁 File      →  "Read the file sample.txt and summarize it"',
  '  🌐 Search    →  "What is the latest LTS version of Node.js?"',
  '  💬 Direct    →  "Hello! Who are you?"',
  '  🔗 Chained   →  "What is 2 to the power of 16, and is Node.js LTS above that?"',
];

function printExamples() {
  console.log('\n📋 Example queries:\n');
  EXAMPLES.forEach((e) => console.log(e));
  console.log('');
}

// ---------------------------------------------------------------------------
// Main interactive REPL
// ---------------------------------------------------------------------------
async function main() {
  printBanner();

  const rl = readline.createInterface({
    input:  process.stdin,
    output: process.stdout,
    prompt: '❯ You: ',
  });

  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();

    // Handle special commands
    if (!input) {
      rl.prompt();
      return;
    }

    if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
      console.log('\n👋  Goodbye! OpenClaw shutting down.\n');
      rl.close();
      process.exit(0);
    }

    if (input.toLowerCase() === 'examples') {
      printExamples();
      rl.prompt();
      return;
    }

    // Pause prompt while the agent is thinking
    rl.pause();

    try {
      await runAgent(input);
    } catch (err) {
      // runAgent already logs detailed errors; this catches process-level failures
      console.error(`\n❌ Fatal error: ${err.message}\n`);
    } finally {
      rl.resume();
      console.log(''); // blank line for readability
      rl.prompt();
    }
  });

  rl.on('close', () => {
    console.log('\n👋  Session ended. Goodbye!\n');
    process.exit(0);
  });

  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    console.log('\n\n👋  Interrupted. Goodbye!\n');
    process.exit(0);
  });
}

main();
