# Changelog

All notable changes to the MCP Ollama Manager Extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.8] - 2026-03-27

### Changed
- Version bump for release.

## [1.0.7] - 2026-03-27

### Added
- **Ollama Models sidebar view** — new `OllamaModelsProvider` (`TreeDataProvider`) registers against the `mcp-ollama.models` view; lists all locally installed models with name and size; auto-clears when the server stops
- **`mcp-ollama.refreshModels` command** — refresh icon ($(refresh)) in the view title bar; also fires automatically after every pull or delete operation
- **AI tool commands** — Chat with Model, Generate Text, Create Embedding, Show Model Details, Pull Model, Delete Model, List Running Models, Explain Code, Write Docstring
- GitHub Pages documentation site at https://pblagoje.github.io/mcp-ollama-extension/
- MkDocs configuration (`mkdocs.yml`) with Material theme
- GitHub Actions workflow for automatic documentation deployment
- Support section in README with links to Issues and Discussions

### Fixed
- **OLLAMA_HOST blank in Configure Server dialog** — "Ollama Host" input now pre-fills with the effective resolved host (setting → `OLLAMA_HOST` env var → `localhost`) instead of the raw empty setting value
- **mcp-ollama-python install check at startup** — extension now silently verifies the module is installed on activation and shows a warning with an "Install Now" button if it is missing
- Corrected GitHub repository URLs throughout (homepage, repository, bugs)
- Updated Settings reference to match actual extension settings (removed non-existent `serverPath`/`serverPort`, added `extensionLogLevel`)
- Fixed wrong repository links in `LOGGING.md`

## [1.0.0] - 2026-02-13

### Added
- Initial release of MCP Ollama Manager Extension
- Server management commands (start, stop, restart)
- Real-time server status monitoring with status bar indicator
- Configuration management through VS Code settings
- Built-in log viewing with dedicated output channel
- Model listing and management capabilities
- Auto-start option for automatic server startup
- Health check functionality with periodic status updates
- Interactive configuration wizard
- Support for custom Python paths and server parameters
- Explorer integration for model viewing when server is running
- Comprehensive error handling and user feedback

### Features
- **Server Management**:
  - Start MCP Ollama Python server with configurable parameters
  - Stop server gracefully with force fallback
  - Restart server with single command
  - Process monitoring and automatic status updates

- **Status Monitoring**:
  - Real-time status bar indicator (🟢 running, 🔴 stopped)
  - Health check every 5 seconds
  - Detailed status information dialog
  - Context-aware command availability

- **Configuration**:
  - Server path configuration with folder picker
  - Custom Python executable path
  - Configurable host and port settings
  - Log level configuration (debug, info, warning, error)
  - Auto-start toggle
  - Global machine-level settings

- **Model Management**:
  - List all available Ollama models
  - Detailed model information display
  - Model size, family, and parameter details
  - Integration with Ollama API endpoints

- **User Interface**:
  - Dedicated output channel for server logs
  - Interactive configuration dialogs
  - Command palette integration
  - Status bar quick actions
  - Explorer view for models

### Technical Details
- Built with TypeScript for type safety
- Webpack-based build system
- Comprehensive test suite
- ESLint configuration for code quality
- VS Code extension API integration
- Axios for HTTP communication with server
- Child process management for server lifecycle

### Documentation
- Comprehensive README with installation and usage instructions
- Configuration reference table
- Command documentation
- Development setup guide
- Contributing guidelines
- License information
