# Companion MCP Server (Python)

This VS Code extension (`mcp-ollama-extension`) is the **UI**. It manages and talks to a separate Python package:

| | |
|---|---|
| **Repository** | [github.com/pblagoje/mcp-ollama-python](https://github.com/pblagoje/mcp-ollama-python) |
| **Documentation** | [pblagoje.github.io/mcp-ollama-python](https://pblagoje.github.io/mcp-ollama-python/) |
| **PyPI** | [mcp-ollama-python](https://pypi.org/project/mcp-ollama-python/) |

## Install the server

```bash
pip install mcp-ollama-python
```

On startup, the extension checks for the package and can offer **Install Now** if it is missing.

## What the server provides

MCP tools used by the extension (and by other MCP clients):

- `ollama_chat`, `ollama_generate`, `ollama_embed`
- `ollama_list`, `ollama_show`, `ollama_pull`, `ollama_delete`, `ollama_ps`

Full tool reference: [Available Tools](https://pblagoje.github.io/mcp-ollama-python/tools/).

## Architecture

```
This extension (TypeScript)
    │  stdio / JSON-RPC (MCP)
    ▼
mcp-ollama-python
    │  HTTP :11434
    ▼
Ollama
```

The extension does not call Ollama’s HTTP API directly.

## Using the server without this extension

Any MCP client can launch the same package:

```json
{
  "mcpServers": {
    "ollama": {
      "command": "py",
      "args": ["-m", "mcp_ollama_python"],
      "disabled": false
    }
  }
}
```

See the [server installation guide](https://pblagoje.github.io/mcp-ollama-python/installation/).

## Issue tracker

- Extension UI / VS Code commands → [mcp-ollama-extension issues](https://github.com/pblagoje/mcp-ollama-extension/issues)
- MCP tools / Python server → [mcp-ollama-python issues](https://github.com/pblagoje/mcp-ollama-python/issues)
