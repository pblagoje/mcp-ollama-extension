# Changelog

All notable changes to the MCP Ollama Manager Extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
