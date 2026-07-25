# MCP Ollama Manager Extension

A VS Code extension for managing the **[MCP Ollama Python](https://github.com/pblagoje/mcp-ollama-python)** server — start, stop, configure, and monitor Ollama MCP tools directly from Visual Studio Code.

[![VS Code](https://img.shields.io/badge/VS%20Code-1.85+-blue)](https://code.visualstudio.com/)
[![Marketplace](https://img.shields.io/visual-studio-marketplace/v/internetics.mcp-ollama-extension)](https://marketplace.visualstudio.com/items?itemName=internetics.mcp-ollama-extension)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

| | Links |
|---|---|
| **Docs** | [Full documentation](https://pblagoje.github.io/mcp-ollama-extension/) |
| **Marketplace** | [MCP Ollama Manager](https://marketplace.visualstudio.com/items?itemName=internetics.mcp-ollama-extension) |
| **Required server** | [mcp-ollama-python](https://github.com/pblagoje/mcp-ollama-python) · [docs](https://pblagoje.github.io/mcp-ollama-python/) · [PyPI](https://pypi.org/project/mcp-ollama-python/) |

---

## Ecosystem

This extension is the **VS Code UI**. The MCP server lives in a separate repository:

```
┌─────────────────────────────────────┐
│  mcp-ollama-extension (this repo)   │  ← status bar, models tree, commands
│  https://github.com/pblagoje/       │
│       mcp-ollama-extension          │
└─────────────────┬───────────────────┘
                  │ stdio / MCP
┌─────────────────▼───────────────────┐
│  mcp-ollama-python                  │  ← MCP tools (chat, list, pull, …)
│  https://github.com/pblagoje/       │
│       mcp-ollama-python             │
└─────────────────┬───────────────────┘
                  │ HTTP :11434
┌─────────────────▼───────────────────┐
│  Ollama                             │
└─────────────────────────────────────┘
```

| Component | Repository | Install |
|-----------|------------|---------|
| **Extension (this)** | [mcp-ollama-extension](https://github.com/pblagoje/mcp-ollama-extension) | VS Code Marketplace or `.vsix` |
| **MCP server (required)** | [mcp-ollama-python](https://github.com/pblagoje/mcp-ollama-python) | `pip install mcp-ollama-python` |
| **Ollama** | [ollama.ai](https://ollama.ai/) | Install Ollama and keep it running |

Without the Python package, the extension cannot talk to Ollama. Server docs, tools, and security: [pblagoje.github.io/mcp-ollama-python](https://pblagoje.github.io/mcp-ollama-python/).

## Features

- 🚀 **Server Management**: Start, stop, and restart the MCP Ollama server with simple commands
- 📊 **Status Monitoring**: Real-time server status in the status bar with health checks
- ⚙️ **Configuration Management**: Easy configuration of server settings through VS Code settings
- 📝 **Log Viewing**: Built-in output channel for server logs and monitoring
- 🌳 **Ollama Models Sidebar**: Browse all locally installed models in a dedicated Explorer tree view — visible when the server is running, with a refresh button in the view title
- 🤖 **Model Management**: Pull, delete, list running models, and view detailed model information
- 💬 **AI Tools**: Chat with any model, generate text, create embeddings, explain selected code, and write docstrings
- 🔧 **Auto-start Option**: Configure the server to start automatically with VS Code

## Requirements

- **[mcp-ollama-python](https://github.com/pblagoje/mcp-ollama-python)** installed (`pip install mcp-ollama-python`) — [docs](https://pblagoje.github.io/mcp-ollama-python/)
- Python 3.10 or higher
- [Ollama](https://ollama.ai/) installed and running

> **Automatic dependency check:** On every VS Code startup the extension silently verifies that `mcp-ollama-python` is installed. If it is missing a warning notification appears with an **Install Now** button that runs `pip install mcp-ollama-python` and streams output to the *MCP Ollama Server* output channel.

## Installation

### From VS Code Marketplace

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "MCP Ollama Manager"
4. Click Install

### From Source

1. Clone this repository
2. Install dependencies: `npm install`
3. Compile: `npm run compile`
4. Package: `npm run package`
5. Install the resulting `.vsix` file using `code --install-extension mcp-ollama-extension-*.vsix`

Or upgrade:

```bash
code --uninstall-extension internetics.mcp-ollama-extension
code --install-extension mcp-ollama-extension-1.0.1.vsix
```

## Configuration

The extension can be configured through VS Code settings. Open settings (Ctrl+,) and search for "MCP Ollama".

### Important: Configure Ollama Hostname

If your Ollama server is running on a different hostname (not `localhost`), you **must** configure it:

1. Open VS Code Settings (Ctrl+,)
2. Search for "MCP Ollama"
3. Set **"Mcp-ollama: Server Host"** to your Ollama hostname (e.g., `ai`, `192.168.1.100`, etc.)

The extension will connect to Ollama at `http://{serverHost}:11434`

**Example configurations:**
- Local Ollama: `localhost` (default)
- Network hostname: `ai`
- IP address: `192.168.1.100`

> **OLLAMA_HOST environment variable:** When `mcp-ollama.serverHost` is empty the extension automatically falls back to the `OLLAMA_HOST` environment variable. The **Configure Server → Ollama Host** dialog always pre-fills with the effective resolved value (setting → `OLLAMA_HOST` → `localhost`) so you never see a blank field.

### Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `mcp-ollama.serverHost` | string | `localhost` | Hostname where Ollama is running (overrides `OLLAMA_HOST` env var) |
| `mcp-ollama.pythonPath` | string | _(auto)_ | Path to Python executable; auto-detected if empty |
| `mcp-ollama.autoStart` | boolean | `false` | Automatically start the server when VS Code starts |
| `mcp-ollama.logLevel` | string | `info` | Log level for the MCP Ollama server (debug, info, warning, error) |
| `mcp-ollama.extensionLogLevel` | string | `info` | Log level for the VS Code extension itself (debug, info, warning, error) |

See [LOGGING.md](LOGGING.md) for how log levels affect health-check noise and server output.

## Commands

All commands are available in the Command Palette (`Ctrl+Shift+P`) under the **MCP Ollama** category.

### Server

| Command | Description |
|---------|-------------|
| `MCP Ollama: Start Server` | Start the MCP Ollama server |
| `MCP Ollama: Stop Server` | Stop the MCP Ollama server |
| `MCP Ollama: Restart Server` | Restart the MCP Ollama server |
| `MCP Ollama: Show Server Status` | Display current server status and configuration |
| `MCP Ollama: Configure Server` | Interactive configuration wizard |
| `MCP Ollama: View Server Logs` | Show the server output channel |
| `MCP Ollama: Open Log File` | Open the extension log file |
| `MCP Ollama: Clear Logs` | Clear the extension log file |

### Models

| Command | Description |
|---------|-------------|
| `MCP Ollama: List Available Models` | Browse models with size and modification date |
| `MCP Ollama: Refresh Models` | Refresh the Ollama Models sidebar tree |
| `MCP Ollama: Pull Model` | Download a model by name (e.g. `llama3.2`, `mistral`) |
| `MCP Ollama: Delete Model` | Delete a locally installed model |
| `MCP Ollama: Show Model Details` | View full model metadata in a Markdown document |
| `MCP Ollama: List Running Models` | Show models currently loaded in memory with VRAM usage |

### AI Tools

| Command | Description |
|---------|-------------|
| `MCP Ollama: Chat with Model` | Start a chat session; response opens in a Markdown editor |
| `MCP Ollama: Generate Text` | Generate text from a prompt using a selected model |
| `MCP Ollama: Create Embedding` | Create a vector embedding for a text input |
| `MCP Ollama: Explain Code` | Generate an explanation for the selected code in the active editor |
| `MCP Ollama: Write Docstring` | Auto-generate a docstring for the selected function or class |

## Usage

### First Time Setup

1. Install the extension
2. Install the server: `pip install mcp-ollama-python` ([server docs](https://pblagoje.github.io/mcp-ollama-python/installation/))
3. Open the Command Palette (Ctrl+Shift+P)
4. Run **MCP Ollama: Configure Server**
5. Set **Ollama Host** if Ollama is not on `localhost` (LAN hosts are supported; remote access requires a trusted network)
6. Optionally set **Python Path** if auto-detect does not find your interpreter
7. Run **MCP Ollama: Start Server**

### Starting the Server

- Use the command "MCP Ollama: Start Server" or
- Click the status bar item "MCP Ollama" or
- Enable auto-start in settings

### Monitoring

- The status bar shows the server status (🟢 running, 🔴 stopped)
- View real-time logs with "MCP Ollama: View Server Logs"
- Check server status with "MCP Ollama: Show Server Status"

### Managing Models

The **Ollama Models** view appears in the Explorer sidebar whenever the server is running.

- Each entry shows the model name and its size on disk
- Hover over an entry for the full digest and last-modified date
- Click the **$(refresh) Refresh** icon in the view title to reload the list
- The list clears automatically when the server stops

You can also manage models via the Command Palette:
- **Pull Model** — prompts for a model name (e.g. `llama3.2`) and downloads it; the sidebar refreshes on completion
- **Delete Model** — select from installed models; asks for confirmation before deleting; sidebar refreshes on completion
- **List Running Models** — shows which models are currently loaded in GPU/CPU memory and their VRAM usage
- **Show Model Details** — opens a Markdown document with the full model metadata (architecture, parameters, quantization, etc.)

## Development

### Prerequisites

```bash
# Install dependencies
npm install
```

### Building for Development

Development builds are optimized for fast compilation and debugging:

```bash
# Compile TypeScript (development mode)
npm run compile

# Watch mode - automatically recompile on file changes
npm run watch
```

**Development build features:**
- Fast compilation with `transpileOnly` mode (3-5x faster)
- Detailed source maps (`eval-source-map`) for better debugging
- No minification for readable output
- Verbose webpack logging
- Filesystem caching for faster rebuilds (50-80% faster)

### Building for Production

Production builds are optimized for size and performance:

```bash
# Build for production (cross-platform)
npm run build:prod

# Package as VSIX for distribution
npm run package
```

**Note:** The build scripts use `cross-env` for cross-platform compatibility (works on Windows PowerShell, CMD, Linux, and macOS).

**Production build features:**
- Full TypeScript type checking
- Minification (40-60% smaller bundles)
- Optimized source maps (separate files)
- Deterministic module IDs for better caching
- Tree-shaking to remove unused code
- Single-bundle output (required for VS Code extensions)

### Build Comparison

| Feature | Development | Production |
|---------|-------------|------------|
| **Compilation Speed** | Fast (transpileOnly) | Slower (full type check) |
| **Bundle Size** | Larger | 40-60% smaller |
| **Source Maps** | Inline (eval-source-map) | Separate files |
| **Minification** | No | Yes |
| **Debugging** | Excellent | Good |
| **Rebuild Time** | 50-80% faster (cached) | Standard |

### Quick Commands

```bash
# Development workflow
npm install              # Install dependencies
npm run watch            # Start watch mode for development

# Production workflow
npm install              # Install dependencies
npm run build:prod       # Build for production
npm run package          # Create VSIX package

# Install locally
code --install-extension mcp-ollama-extension-*.vsix
```

### Testing

```bash
# Run tests
npm test

# Run in watch mode
npm run watch-tests
```

### Debugging

1. Open the project in VS Code
2. Press F5 to launch a new VS Code instance with the extension
3. Use the debugger to set breakpoints and debug the extension
4. Check the Debug Console for logs and errors
5. Use "MCP Ollama: View Server Logs" to see server output

**Debug Tips:**
- Development builds include detailed source maps for accurate debugging
- Use `logger.debug()` for verbose logging (set log level to 'debug')
- The extension logs are stored in VS Code's log directory
- Server logs are available in the output channel

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for full release history.

## Security

Host validation, MCP allowlists, and minimal child-process environment are documented in [docs/SECURITY.md](docs/SECURITY.md). Use **mcp-ollama-python** 1.0.8+ for matching server-side hardening — see [server security docs](https://pblagoje.github.io/mcp-ollama-python/SECURITY/).

## Support

- Report issues on [GitHub Issues](https://github.com/pblagoje/mcp-ollama-extension/issues)
- Check the [documentation](https://pblagoje.github.io/mcp-ollama-extension/) for detailed guides
- Join [GitHub Discussions](https://github.com/pblagoje/mcp-ollama-extension/discussions) for questions and suggestions
- Server / MCP tool issues: [mcp-ollama-python Issues](https://github.com/pblagoje/mcp-ollama-python/issues)

## Contributing

1. Fork the [repository](https://github.com/pblagoje/mcp-ollama-extension)
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Related Projects

| Project | Role | Links |
|---------|------|-------|
| **[mcp-ollama-python](https://github.com/pblagoje/mcp-ollama-python)** | MCP server this extension manages | [GitHub](https://github.com/pblagoje/mcp-ollama-python) · [Docs](https://pblagoje.github.io/mcp-ollama-python/) · [PyPI](https://pypi.org/project/mcp-ollama-python/) |
| [Ollama](https://ollama.ai/) | Local LLM runtime | [ollama.ai](https://ollama.ai/) |

---

**Note:** This extension requires the MCP Ollama Python server separately. Installation: [mcp-ollama-python docs](https://pblagoje.github.io/mcp-ollama-python/installation/).
