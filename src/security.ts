/**
 * Host, path, and identifier validation for the VS Code extension.
 */

import * as path from 'path';

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', 'host.docker.internal']);
const BLOCKED_HOSTNAMES = new Set(['169.254.169.254', 'metadata.google.internal']);
const MODEL_NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/;
const HOSTNAME_RE =
    /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$|^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$|^\[[0-9a-fA-F:]+\]$|^::1$/;
const STANDARD_PYTHON_COMMANDS = new Set(['python', 'python3', 'py']);
const FORBIDDEN_PATH_CHARS = /[\0\r\n;|&$`<>]/;

export const ALLOWED_MCP_TOOLS = new Set([
    'ollama_chat',
    'ollama_generate',
    'ollama_embed',
    'ollama_show',
    'ollama_pull',
    'ollama_delete',
    'ollama_ps',
    'ollama_list',
]);

export const ALLOWED_MCP_PROMPTS = new Set(['explain_code', 'write_docstring']);

export const ALLOWED_RESOURCE_URIS = new Set([
    'ollama://models',
    'ollama://running',
    'ollama://config',
]);

const MCP_ENV_PASSTHROUGH = [
    'PATH',
    'PATHEXT',
    'HOME',
    'USERPROFILE',
    'SYSTEMROOT',
    'WINDIR',
    'COMSPEC',
    'TEMP',
    'TMP',
    'LANG',
    'LC_ALL',
    'PYTHONIOENCODING',
    'PYTHONUTF8',
    'VIRTUAL_ENV',
];

/**
 * Parse and validate a hostname or host:port / URL fragment for Ollama.
 */
export function parseServerHostInput(raw: string): string {
    let value = raw.trim();
    if (!value) {
        return 'localhost';
    }

    if (value.includes('://') || value.includes('/')) {
        const url = new URL(value.includes('://') ? value : `http://${value}`);
        if (url.username || url.password) {
            throw new Error('Host URL must not contain embedded credentials');
        }
        if (url.pathname && url.pathname !== '/') {
            throw new Error('Host must not include a path');
        }
        if (url.search || url.hash) {
            throw new Error('Host must not include query or fragment');
        }
        value = url.hostname;
    } else if (value.startsWith('[')) {
        const end = value.indexOf(']');
        if (end > 0) {
            value = value.slice(1, end);
        }
    } else if (value.includes(':') && value.split(':').length === 2 && !value.includes('::')) {
        value = value.split(':')[0];
    }

    const bare = value.replace(/^\[|\]$/g, '').toLowerCase();
    if (BLOCKED_HOSTNAMES.has(bare)) {
        throw new Error('Host points to a blocked metadata endpoint');
    }
    if (LOCAL_HOSTNAMES.has(bare)) {
        return value;
    }

    if (!HOSTNAME_RE.test(value) && !HOSTNAME_RE.test(bare)) {
        throw new Error('Invalid hostname or IP address format');
    }

    return value;
}

export function isLocalOllamaHost(host: string): boolean {
    const bare = host.replace(/^\[|\]$/g, '').toLowerCase();
    return LOCAL_HOSTNAMES.has(bare);
}

/**
 * Build a full OLLAMA_HOST URL for the Python MCP server.
 */
export function buildOllamaHostUrl(host: string): string {
    const hostname = parseServerHostInput(host);
    const hostForUrl =
        hostname.includes(':') && !hostname.startsWith('[') ? `[${hostname}]` : hostname;
    return `http://${hostForUrl}:11434`;
}

/**
 * Validate Python executable path or standard launcher command.
 */
export function validatePythonPath(pythonPath: string): string {
    const trimmed = pythonPath.trim();
    if (!trimmed) {
        return '';
    }
    if (FORBIDDEN_PATH_CHARS.test(trimmed)) {
        throw new Error('Invalid Python path: forbidden characters');
    }
    if (STANDARD_PYTHON_COMMANDS.has(trimmed)) {
        return trimmed;
    }
    if (!path.isAbsolute(trimmed)) {
        throw new Error(
            'Python path must be absolute or one of: python, python3, py'
        );
    }
    return trimmed;
}

export function validateModelName(model: string): string {
    const clean = model.trim();
    if (!clean || !MODEL_NAME_RE.test(clean)) {
        throw new Error(
            'Invalid model name. Use alphanumeric characters, dots, underscores, hyphens, or colons.'
        );
    }
    return clean;
}

export function validateResourceUri(uri: string): string {
    if (!ALLOWED_RESOURCE_URIS.has(uri)) {
        throw new Error(`Unsupported resource URI: ${uri}`);
    }
    return uri;
}

export function validateToolName(name: string): string {
    if (!ALLOWED_MCP_TOOLS.has(name)) {
        throw new Error(`Unsupported MCP tool: ${name}`);
    }
    return name;
}

export function validatePromptName(name: string): string {
    if (!ALLOWED_MCP_PROMPTS.has(name)) {
        throw new Error(`Unsupported MCP prompt: ${name}`);
    }
    return name;
}

/**
 * Minimal environment for the MCP Python child process.
 */
export function buildMcpServerEnv(serverHost: string): Record<string, string> {
    const env: Record<string, string> = {};
    for (const key of MCP_ENV_PASSTHROUGH) {
        const value = process.env[key];
        if (value) {
            env[key] = value;
        }
    }

    const hostname = parseServerHostInput(serverHost);
    env.OLLAMA_HOST = buildOllamaHostUrl(hostname);
    if (!isLocalOllamaHost(hostname)) {
        env.OLLAMA_ALLOW_REMOTE_HOST = '1';
    }

    if (process.env.OLLAMA_API_KEY) {
        env.OLLAMA_API_KEY = process.env.OLLAMA_API_KEY;
    }
    if (process.env.OLLAMA_MODELS) {
        env.OLLAMA_MODELS = process.env.OLLAMA_MODELS;
    }

    return env;
}
