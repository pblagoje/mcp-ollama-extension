# Security

Threat model and security controls for the **MCP Ollama Manager** VS Code extension.

## Trust model

The extension runs in the **local VS Code workspace** with the same privileges as the user. It spawns the [mcp-ollama-python](https://pblagoje.github.io/mcp-ollama-python/) MCP server as a child process and forwards Ollama operations through MCP tools.

Anyone who can change VS Code settings or run extension commands can start/stop the server, pull/delete models, and use AI commands.

## Controls (v1.0.9+)

| Area | Control |
|------|---------|
| `mcp-ollama.serverHost` | Validated hostname/IP; rejects URLs with credentials, paths, or blocked metadata hosts |
| MCP child process env | Minimal passthrough (PATH, locale, etc.) — not full `process.env`; sets `OLLAMA_HOST` and `OLLAMA_ALLOW_REMOTE_HOST=1` for non-local hosts (aligned with mcp-ollama-python v1.0.8+) |
| Python path | Must be `python` / `python3` / `py` or an absolute path; shell metacharacters rejected |
| Model names | Validated before pull/delete/show/chat/generate/embed |
| MCP tools | Allowlist only (`ollama_chat`, `ollama_generate`, … — not `ollama_execute`) |
| MCP prompts | Allowlist only (`explain_code`, `write_docstring`) |
| MCP resources | Allowlist only (`ollama://models`, `ollama://running`, `ollama://config`) |
| Logging | Sensitive keys redacted in extension logs (`src/logger.ts`) |

## Settings

| Setting | Security note |
|---------|----------------|
| `mcp-ollama.serverHost` | Use LAN/remote values only on trusted networks |
| `mcp-ollama.pythonPath` | Point to a trusted Python installation only |

## Related hardening

The Python MCP server has its own controls (host validation, opt-in code execution). See [mcp-ollama-python SECURITY](https://pblagoje.github.io/mcp-ollama-python/SECURITY/).

## Reporting

Report issues via [GitHub Security Advisories](https://github.com/pblagoje/mcp-ollama-extension/security/advisories).
