# MCP Ollama Manager Extension

A VS Code extension for managing the [MCP Ollama Python](https://pblagoje.github.io/mcp-ollama-python/) server — start, stop, configure and monitor your Ollama MCP server directly from Visual Studio Code.

## Features

- **Server Management** — Start, stop, and restart the MCP Ollama server with simple commands
- **Status Monitoring** — Real-time server status in the status bar with health checks
- **Configuration Management** — Easy configuration of server settings through VS Code settings
- **Log Viewing** — Built-in output channel for server logs and monitoring
- **Model Management** — List and view details of available Ollama models
- **Auto-start Option** — Configure the server to start automatically with VS Code

## Requirements

- [MCP Ollama Python](https://github.com/pblagoje/mcp-ollama-python) installed
- Python 3.7 or higher
- [Ollama](https://ollama.ai/) installed and running

## Quick Start

1. Install the extension from the VS Code Marketplace (search **MCP Ollama Manager**)
2. Open Command Palette (`Ctrl+Shift+P`) and run **MCP Ollama: Configure Server**
3. Set your `mcp-ollama.serverHost` if Ollama is not on `localhost`
4. Run **MCP Ollama: Start Server**

## Configuration

Open VS Code Settings (`Ctrl+,`) and search for **MCP Ollama**.

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `mcp-ollama.serverHost` | string | `localhost` | Hostname where Ollama is running (overrides `OLLAMA_HOST` env var). Examples: `localhost`, `ai`, `192.168.1.100` |
| `mcp-ollama.pythonPath` | string | _(auto)_ | Path to Python executable; auto-detected if empty |
| `mcp-ollama.autoStart` | boolean | `false` | Automatically start the server when VS Code starts |
| `mcp-ollama.logLevel` | string | `info` | Log level for the MCP Ollama server (`debug`, `info`, `warning`, `error`) |
| `mcp-ollama.extensionLogLevel` | string | `info` | Log level for the VS Code extension itself (`debug`, `info`, `warning`, `error`) |

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
| `MCP Ollama: List Available Models` | List all installed Ollama models |
| `MCP Ollama: Chat with Model` | Start a chat session with a model |
| `MCP Ollama: Generate Text` | Generate text using a model |
| `MCP Ollama: Create Embedding` | Create text embeddings |
| `MCP Ollama: Show Model Details` | Show details for a specific model |
| `MCP Ollama: Pull Model` | Download a model from Ollama |
| `MCP Ollama: Delete Model` | Remove an installed model |
| `MCP Ollama: List Running Models` | Show currently loaded models |
| `MCP Ollama: Explain Code` | Use AI to explain selected code |
| `MCP Ollama: Write Docstring` | Generate a docstring for selected code |

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

## Logging

See [LOGGING.md](https://github.com/pblagoje/mcp-ollama-extension/blob/main/LOGGING.md) for detailed logging documentation including log file locations, log levels, and debugging tips.

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

- Report issues on [GitHub Issues](https://github.com/pblagoje/mcp-ollama-extension/issues)
- Join [GitHub Discussions](https://github.com/pblagoje/mcp-ollama-extension/discussions) for questions and suggestions

## Related Projects

- [MCP Ollama Python](https://pblagoje.github.io/mcp-ollama-python/) — The Python MCP server for Ollama
- [Ollama](https://ollama.ai/) — Run large language models locally

## License

MIT License — see [LICENSE](https://github.com/pblagoje/mcp-ollama-extension/blob/main/LICENSE) for details.
