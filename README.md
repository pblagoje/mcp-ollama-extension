# MCP Ollama Manager Extension

A VS Code extension for managing the MCP Ollama Python server, providing a convenient interface to start, stop, configure and monitor your Ollama MCP server directly from Visual Studio Code.

## Features

- 🚀 **Server Management**: Start, stop, and restart the MCP Ollama server with simple commands
- 📊 **Status Monitoring**: Real-time server status in the status bar with health checks
- ⚙️ **Configuration Management**: Easy configuration of server settings through VS Code settings
- 📝 **Log Viewing**: Built-in output channel for server logs and monitoring
- 🤖 **Model Management**: List and view details of available Ollama models
- 🔧 **Auto-start Option**: Configure the server to start automatically with VS Code

## Requirements

- [MCP Ollama Python](https://github.com/pblagoje/mcp-ollama-python) installed
- Python 3.7 or higher
- [Ollama](https://ollama.ai/) installed and running

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
1. Uninstall the old version (optional but recommended)
code --uninstall-extension internetics.mcp-ollama-extension

2. Install the new VSIX
code --install-extension mcp-ollama-extension-1.0.1.vsix

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

### Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `mcp-ollama.serverPath` | string | - | Path to the mcp-ollama-python installation directory |
| `mcp-ollama.pythonPath` | string | `python` | Path to Python executable |
| `mcp-ollama.serverHost` | string | `localhost` | Host for the MCP server |
| `mcp-ollama.serverPort` | number | `8000` | Port for the MCP server |
| `mcp-ollama.autoStart` | boolean | `false` | Automatically start the server when VS Code starts |
| `mcp-ollama.logLevel` | string | `info` | Log level for the server (debug, info, warning, error) |

## Commands

The extension provides the following commands (available in the Command Palette, Ctrl+Shift+P):

- `MCP Ollama: Start Server` - Start the MCP Ollama server
- `MCP Ollama: Stop Server` - Stop the MCP Ollama server
- `MCP Ollama: Restart Server` - Restart the MCP Ollama server
- `MCP Ollama: Show Server Status` - Display current server status and configuration
- `MCP Ollama: Configure Server` - Open configuration options
- `MCP Ollama: View Server Logs` - Show the server output channel
- `MCP Ollama: List Available Models` - List and manage Ollama models

## Usage

### First Time Setup

1. Install the extension
2. Open the Command Palette (Ctrl+Shift+P)
3. Run "MCP Ollama: Configure Server"
4. Select "Configure Server Path" and choose your mcp-ollama-python installation directory
5. Configure other settings as needed (port, log level, etc.)

### Starting the Server

- Use the command "MCP Ollama: Start Server" or
- Click the status bar item "MCP Ollama" or
- Enable auto-start in settings

### Monitoring

- The status bar shows the server status (🟢 running, 🔴 stopped)
- View real-time logs with "MCP Ollama: View Server Logs"
- Check server status with "MCP Ollama: Show Server Status"

### Managing Models

- Use "MCP Ollama: List Available Models" to see all installed models
- Select a model to view detailed information
- Models are shown in the Explorer view when the server is running

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

### 1.0.0

- Initial release
- Basic server management (start, stop, restart)
- Status monitoring with health checks
- Configuration management
- Log viewing
- Model listing and management
- Auto-start capability

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Related Projects

- [MCP Ollama Python](https://pblagoje.github.io/mcp-ollama-python/) - The Python MCP server for Ollama
- [Ollama](https://ollama.ai/) - Get up and running with large language models locally

---

**Note**: This extension requires the MCP Ollama Python server to be installed separately. Please refer to the [MCP Ollama Python documentation](https://pblagoje.github.io/mcp-ollama-python/) for installation instructions.
