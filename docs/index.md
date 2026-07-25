# MCP Ollama Manager Extension

A VS Code extension for managing the **[MCP Ollama Python](https://github.com/pblagoje/mcp-ollama-python)** server — start, stop, configure and monitor your Ollama MCP server directly from Visual Studio Code.

| Resource | Link |
|----------|------|
| GitHub (this extension) | [pblagoje/mcp-ollama-extension](https://github.com/pblagoje/mcp-ollama-extension) |
| Marketplace | [MCP Ollama Manager](https://marketplace.visualstudio.com/items?itemName=internetics.mcp-ollama-extension) |
| Required MCP server | [mcp-ollama-python](https://github.com/pblagoje/mcp-ollama-python) · [docs](https://pblagoje.github.io/mcp-ollama-python/) · [PyPI](https://pypi.org/project/mcp-ollama-python/) |

## Ecosystem

```
This extension (VS Code UI)
        │  stdio / MCP
        ▼
mcp-ollama-python
        │  HTTP :11434
        ▼
Ollama
```

See [Companion MCP Server](companion-server.md) for how the two repositories fit together.

## Features

- **Server Management** — Start, stop, and restart the MCP Ollama server with simple commands
- **Status Monitoring** — Real-time server status in the status bar with health checks
- **Configuration Management** — Easy configuration of server settings through VS Code settings
- **Log Viewing** — Built-in output channel for server logs and monitoring
- **Ollama Models Sidebar** — Browse all locally installed models in a dedicated Explorer tree view; visible when the server is running with a refresh button in the view title
- **Model Management** — Pull, delete, list running models, and view detailed model information
- **AI Tools** — Chat with models, generate text, create embeddings, explain code, write docstrings
- **Auto-start Option** — Configure the server to start automatically with VS Code

## Requirements

- [MCP Ollama Python](https://github.com/pblagoje/mcp-ollama-python) installed (`pip install mcp-ollama-python`)
- Python 3.10 or higher
- [Ollama](https://ollama.ai/) installed and running

> **Automatic dependency check:** On every VS Code startup the extension silently verifies that `mcp-ollama-python` is installed. If it is missing a warning notification appears with an **Install Now** button that runs `pip install mcp-ollama-python` and streams output to the *MCP Ollama Server* output channel.

## Quick Start

1. Install the extension from the VS Code Marketplace (search **MCP Ollama Manager**)
2. Install the server: `pip install mcp-ollama-python` — [installation guide](https://pblagoje.github.io/mcp-ollama-python/installation/)
3. Open Command Palette (`Ctrl+Shift+P`) and run **MCP Ollama: Configure Server**
4. Set your `mcp-ollama.serverHost` if Ollama is not on `localhost`
5. Run **MCP Ollama: Start Server**

## Configuration

Open VS Code Settings (`Ctrl+,`) and search for **MCP Ollama**.

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `mcp-ollama.serverHost` | string | `localhost` | Hostname where Ollama is running. When empty, falls back to the `OLLAMA_HOST` environment variable, then `localhost`. Examples: `localhost`, `ai`, `192.168.1.100` |
| `mcp-ollama.pythonPath` | string | _(auto)_ | Path to Python executable; auto-detected if empty |
| `mcp-ollama.autoStart` | boolean | `false` | Automatically start the server when VS Code starts |
| `mcp-ollama.logLevel` | string | `info` | Log level for the MCP Ollama server (`debug`, `info`, `warning`, `error`) |
| `mcp-ollama.extensionLogLevel` | string | `info` | Log level for the VS Code extension itself (`debug`, `info`, `warning`, `error`) |

See [Security](SECURITY.md) for host validation, MCP allowlists, and the child-process trust model.

## Commands

All commands are available via the Command Palette (`Ctrl+Shift+P`):

| Command | Description |
|---------|-------------|
| `MCP Ollama: Start Server` | Start the MCP Ollama server |
| `MCP Ollama: Stop Server` | Stop the MCP Ollama server |
| `MCP Ollama: Restart Server` | Restart the MCP Ollama server |
| `MCP Ollama: Show Server Status` | Display current server status and configuration |
| `MCP Ollama: Configure Server` | Open configuration options |
| `MCP Ollama: View Server Logs` | Show the server output channel |
| `MCP Ollama: Open Log File` | Open the extension log file in the editor |
| `MCP Ollama: Clear Logs` | Clear both output channel and log file |
| `MCP Ollama: List Available Models` | Browse models with size and modification date |
| `MCP Ollama: Refresh Models` | Refresh the Ollama Models sidebar tree |
| `MCP Ollama: Chat with Model` | Start a chat session with a model |
| `MCP Ollama: Generate Text` | Generate text using a model |
| `MCP Ollama: Create Embedding` | Create text embeddings |
| `MCP Ollama: Show Model Details` | Show details for a specific model |
| `MCP Ollama: Pull Model` | Download a model from Ollama |
| `MCP Ollama: Delete Model` | Remove an installed model |
| `MCP Ollama: List Running Models` | Show currently loaded models |
| `MCP Ollama: Explain Code` | Use AI to explain selected code |
| `MCP Ollama: Write Docstring` | Generate a docstring for selected code |

## Ollama Models Sidebar

The **Ollama Models** view appears in the Explorer sidebar whenever the server is running.

- Each entry shows the model name and size on disk
- Hover over an entry for the full digest and last-modified date
- Click the **Refresh** icon in the view title to reload the list
- The list clears automatically when the server stops
- The sidebar refreshes automatically after a Pull or Delete operation

## Architecture

The extension communicates with the MCP Ollama Python server over **stdio/JSON-RPC** (Model Context Protocol). It does not query Ollama's HTTP API directly — all Ollama access goes through the MCP server.

```
VS Code Extension (TypeScript)
    │  stdio / JSON-RPC (MCP Protocol)
    ▼
MCP Ollama Python Server
    │  HTTP REST API (port 11434)
    ▼
Ollama Native Server
```

For full architecture details see [ARCHITECTURE.md](https://github.com/pblagoje/mcp-ollama-extension/blob/main/ARCHITECTURE.md).  
For the server side see [mcp-ollama-python architecture](https://pblagoje.github.io/mcp-ollama-python/architecture/).

## Logging

See [LOGGING.md](https://github.com/pblagoje/mcp-ollama-extension/blob/main/LOGGING.md) for detailed logging documentation including log file locations, log levels, and debugging tips.

Use `mcp-ollama.extensionLogLevel: info` (default) for normal use; set `debug` only when troubleshooting (health checks log every few seconds at DEBUG).

## Installation from Source

```bash
git clone https://github.com/pblagoje/mcp-ollama-extension.git
cd mcp-ollama-extension
npm install
npm run build:prod
npm run package
code --install-extension mcp-ollama-extension-*.vsix
```

## Support

- Extension issues: [mcp-ollama-extension Issues](https://github.com/pblagoje/mcp-ollama-extension/issues)
- Server / MCP tool issues: [mcp-ollama-python Issues](https://github.com/pblagoje/mcp-ollama-python/issues)
- Discussions: [mcp-ollama-extension Discussions](https://github.com/pblagoje/mcp-ollama-extension/discussions)

## Related Projects

- [MCP Ollama Python](https://github.com/pblagoje/mcp-ollama-python) — The Python MCP server ([docs](https://pblagoje.github.io/mcp-ollama-python/), [PyPI](https://pypi.org/project/mcp-ollama-python/))
- [Companion MCP Server](companion-server.md) — How this extension relates to the Python package
- [Ollama](https://ollama.ai/) — Run large language models locally

## License

MIT License — see [LICENSE](https://github.com/pblagoje/mcp-ollama-extension/blob/main/LICENSE) for details.
