'use strict';

const fs = require('fs/promises');
const path = require('path');

// The fileReader is constrained to this root directory.
// Paths that attempt to escape (e.g. ../../etc/passwd) are rejected.
const ALLOWED_ROOT = path.resolve(
  process.env.ALLOWED_FILE_ROOT || './data'
);

/**
 * fileReader tool
 *
 * Reads a file from within the allowed root directory and returns
 * its contents as a string. Path traversal attacks are blocked by
 * verifying that the resolved absolute path starts with ALLOWED_ROOT.
 */
const fileReader = {
  name: 'fileReader',

  description:
    'Reads the contents of a local file and returns it as text. ' +
    'The file must be inside the allowed data directory. ' +
    'Use this tool when the user asks you to read, open, summarize, or inspect a file.',

  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description:
          'Relative path to the file inside the data directory, e.g. "sample.txt" or "notes/todo.txt"',
      },
    },
    required: ['path'],
  },

  /**
   * @param {{ path: string }} args
   * @returns {Promise<string>}
   */
  async execute({ path: filePath }) {
    try {
      // Resolve against the allowed root to get an absolute path
      const resolved = path.resolve(ALLOWED_ROOT, filePath);

      // Security check: ensure the resolved path is still within ALLOWED_ROOT
      if (!resolved.startsWith(ALLOWED_ROOT + path.sep) && resolved !== ALLOWED_ROOT) {
        return `Access denied: "${filePath}" is outside the allowed directory. ` +
          `Only files inside "${ALLOWED_ROOT}" can be read.`;
      }

      const content = await fs.readFile(resolved, 'utf8');

      if (content.trim().length === 0) {
        return `File "${filePath}" exists but is empty.`;
      }

      // Truncate very large files to avoid flooding the LLM context
      const MAX_CHARS = 4000;
      if (content.length > MAX_CHARS) {
        return (
          `[File truncated to ${MAX_CHARS} characters]\n\n` +
          content.slice(0, MAX_CHARS) +
          '\n\n[... file continues beyond this point ...]'
        );
      }

      return content;
    } catch (err) {
      if (err.code === 'ENOENT') {
        return `File not found: "${filePath}". Make sure the file exists inside the data/ directory.`;
      }
      if (err.code === 'EISDIR') {
        return `"${filePath}" is a directory, not a file. Please provide a file path.`;
      }
      return `Error reading file "${filePath}": ${err.message}`;
    }
  },
};

module.exports = fileReader;
