# MCP Ollama Extension Architecture

## Overview

This VS Code extension manages the **MCP Ollama Python server** and provides a user interface for interacting with Ollama models through the Model Context Protocol (MCP).

## Architecture Components

### 1. MCP Ollama Python Server
- **Protocol**: MCP (Model Context Protocol) over stdio/JSON-RPC
- **Purpose**: Provides structured access to Ollama functionality through MCP resources, tools, and prompts
- **Communication**: Standard input/output (stdio), NOT HTTP endpoints
- **Location**: Python package `mcp_ollama_python`

### 2. VS Code Extension
- **Language**: TypeScript
- **Purpose**: 
  - Manage the MCP server process lifecycle (start/stop/restart)
  - Provide VS Code UI for Ollama operations
  - Communicate with MCP server via MCP SDK
- **Components**:
  - `extension.ts`: Main extension logic, process management, VS Code commands
  - `mcpClient.ts`: MCP client wrapper for communicating with the server
  - `logger.ts`: Logging utility

### 3. Ollama Native API
- **Protocol**: HTTP REST API
- **Default Port**: 11434
- **Purpose**: Native Ollama server that the MCP server communicates with
- **Access**: The MCP server queries Ollama; the extension queries the MCP server

## Communication Flow

```
┌─────────────────────────────────────────────────────────────┐
│  VS Code Extension (TypeScript)                             │
│  ├─ Process Management (spawn/kill MCP server)             │
│  ├─ UI Commands (list models, configure, etc.)             │
│  └─ MCP Client (stdio/JSON-RPC communication)              │
└────────────────────────┬────────────────────────────────────┘
                         │ stdio/JSON-RPC
                         │ (MCP Protocol)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  MCP Ollama Python Server                                   │
│  ├─ MCP Resources (ollama://models, ollama://running, etc.)│
│  ├─ MCP Tools (generate, chat, embed, etc.)                │
│  └─ MCP Prompts (code_review, explain_lora, etc.)          │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP REST API
                         │ (port 11434)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  Ollama Native Server                                       │
│  └─ Model execution, API endpoints                         │
└─────────────────────────────────────────────────────────────┘
```

## MCP Resources

The MCP server exposes these resources that the extension can query:

- `ollama://models` - List all available Ollama models
- `ollama://running` - List currently running models
- `ollama://config` - Ollama server configuration

## Configuration

### Extension Settings

- `mcp-ollama.serverHost`: Hostname where Ollama is running (e.g., 'localhost', 'ai')
  - Used to set `OLLAMA_HOST` environment variable for the MCP server
  - The MCP server will connect to Ollama at `http://{serverHost}:11434`
- `mcp-ollama.serverPort`: Port for the MCP server (default: 8000) - **NOT USED** (MCP uses stdio)
- `mcp-ollama.pythonPath`: Path to Python executable
- `mcp-ollama.serverPath`: Path to MCP server installation
- `mcp-ollama.autoStart`: Auto-start server on VS Code launch
- `mcp-ollama.logLevel`: Logging level

## Key Design Decisions

### Why MCP SDK?

The extension uses `@modelcontextprotocol/sdk` to properly communicate with the MCP server because:

1. **MCP servers use stdio**, not HTTP - they communicate via JSON-RPC over standard input/output
2. **Structured protocol** - MCP provides a standardized way to access resources, call tools, and use prompts
3. **Type safety** - The SDK provides TypeScript types for all MCP operations
4. **Future-proof** - As MCP evolves, the SDK will be updated

### Why Not Query Ollama Directly?

The extension **should not** query Ollama's HTTP API directly because:

1. **Architecture violation** - The MCP server is designed to be the intermediary
2. **Duplicate logic** - The MCP server already handles Ollama communication
3. **Loss of MCP features** - Direct queries bypass MCP tools, prompts, and structured responses
4. **Configuration complexity** - Managing two separate connections is error-prone

## Migration Notes

### Previous Architecture (Incorrect)
- Extension spawned MCP server process
- Extension queried Ollama HTTP API directly at `http://{host}:11434/api/tags`
- MCP server was unused except as a background process

### Current Architecture (Correct)
- Extension spawns MCP server process via MCP SDK
- Extension communicates with MCP server via stdio/JSON-RPC
- MCP server queries Ollama and returns structured responses
- Extension uses MCP resources to get model lists and configuration

## Development

### Building
```bash
npm run build:dev   # Development build
npm run build:prod  # Production build (minified)
```

### Testing
```bash
npm run watch       # Watch mode for development
# Press F5 to launch Extension Development Host
```

### Packaging
```bash
npm run package     # Creates .vsix file
```

### Installation
```bash
code --install-extension mcp-ollama-extension-{version}.vsix
```

## Dependencies

- `@modelcontextprotocol/sdk` - MCP protocol implementation
- `axios` - HTTP client (for potential future direct Ollama queries if needed)
- `vscode` - VS Code extension API

## Future Enhancements

- Expose MCP tools in VS Code commands (generate, chat, embed)
- Use MCP prompts for code review and other AI-assisted tasks
- Add MCP sampling for interactive model conversations
- Support multiple MCP server instances
