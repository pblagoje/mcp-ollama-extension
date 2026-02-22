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

- [MCP Ollama Python](https://github.com/mcp-ollama/mcp-ollama-python) installed
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

## Configuration

The extension can be configured through VS Code settings. Open settings and search for "MCP Ollama".

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

### Building

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch for changes
npm run watch

# Package for distribution
npm run package
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

## Support

- Report issues on [GitHub Issues](https://github.com/mcp-ollama/mcp-ollama-extension/issues)
- Check the [Wiki](https://github.com/mcp-ollama/mcp-ollama-extension/wiki) for documentation
- Join our discussions for questions and suggestions

## Related Projects

- [MCP Ollama Python](https://github.com/mcp-ollama/mcp-ollama-python) - The Python MCP server for Ollama
- [Ollama](https://ollama.ai/) - Get up and running with large language models locally

---

**Note**: This extension requires the MCP Ollama Python server to be installed separately. Please refer to the [MCP Ollama Python documentation](https://github.com/mcp-ollama/mcp-ollama-python) for installation instructions.
