# Logging in MCP Ollama Extension

The MCP Ollama extension provides comprehensive logging capabilities to help you monitor and debug both the extension and the MCP Ollama server.

## 📊 Logging Features

### **Dual Logging System**
1. **OutputChannel** - View logs directly in VS Code's Output panel
2. **Persistent Log File** - Logs saved to disk for debugging across sessions

### **Log Levels**
- `DEBUG` - Detailed diagnostic information
- `INFO` - General informational messages
- `WARNING` - Warning messages for potential issues
- `ERROR` - Error messages with stack traces

## 🎯 How to Use Logging

### **View Logs in VS Code**

**Method 1: Command Palette**
1. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
2. Type "MCP Ollama: View Server Logs"
3. Press Enter

**Method 2: Status Bar**
- Click the MCP Ollama status bar item
- Click "View Logs" in the status dialog

This opens the **Output** panel showing server stdout/stderr.

### **View Extension Logs**

The extension logs are written to:
- **OutputChannel**: "MCP Ollama" (separate from server logs)
- **Log File**: Stored in VS Code's log directory

**To view extension logs:**
1. Open Command Palette (`Ctrl+Shift+P`)
2. Run: `MCP Ollama: Open Log File`

This opens the persistent log file in the editor.

### **Clear Logs**

To clear both OutputChannel and log file:
1. Open Command Palette
2. Run: `MCP Ollama: Clear Logs`

## ⚙️ Configuration

### **Extension Log Level**

Control what the extension logs:

```json
{
  "mcp-ollama.extensionLogLevel": "info"
}
```

Options: `debug`, `info`, `warning`, `error`

### **Server Log Level**

Control what the MCP Ollama server logs:

```json
{
  "mcp-ollama.logLevel": "info"
}
```

Options: `debug`, `info`, `warning`, `error`

### **Change Log Level at Runtime**

The extension automatically reloads when you change `extensionLogLevel` in settings.

## 📁 Log File Location

Extension logs are stored in VS Code's log directory:

**Windows:**
```
%APPDATA%\Code\logs\<session-id>\exthost\mcp-ollama.log
```

**macOS:**
```
~/Library/Application Support/Code/logs/<session-id>/exthost/mcp-ollama.log
```

**Linux:**
```
~/.config/Code/logs/<session-id>/exthost/mcp-ollama.log
```

## 🔍 What Gets Logged

### **Extension Events**
- ✅ Extension activation/deactivation
- ✅ Server start/stop/restart
- ✅ Configuration changes
- ✅ Health checks
- ✅ Model fetching
- ✅ Error conditions with stack traces

### **Log Format**
```
[2024-02-22T10:30:45.123Z] [INFO] MCP Ollama Extension activated
[2024-02-22T10:30:47.456Z] [INFO] Starting MCP Ollama server... | {"python":"python","script":"/path/to/main.py","host":"localhost","port":8000}
[2024-02-22T10:30:50.789Z] [INFO] Server started successfully
```

Each log entry includes:
- **Timestamp** (ISO 8601 format)
- **Log Level** (DEBUG/INFO/WARNING/ERROR)
- **Message**
- **Structured Data** (JSON, when applicable)

## 🐛 Debugging Tips

### **Enable Debug Logging**
For detailed diagnostics:
1. Set `"mcp-ollama.extensionLogLevel": "debug"`
2. Restart the extension or reload VS Code
3. Reproduce the issue
4. Open log file and share with support

### **Common Issues**

**Server won't start:**
- Check extension logs for configuration errors
- Look for "Main script not found" errors
- Verify Python path and server path settings

**Server crashes:**
- Check server output channel for Python errors
- Look for port conflicts
- Review server log level settings

**Performance issues:**
- Enable debug logging temporarily
- Check health check frequency
- Monitor log file size

## 📝 Best Practices

1. **Use INFO level for production** - Balances detail with performance
2. **Use DEBUG level for troubleshooting** - Provides maximum detail
3. **Clear logs periodically** - Prevents log file from growing too large
4. **Share logs when reporting issues** - Helps maintainers diagnose problems

## 🔧 Advanced Usage

### **Programmatic Access**

If you're extending this extension, you can use the logger:

```typescript
import { logger } from './logger';

// Log at different levels
logger.debug('Detailed debug info', { data: someData });
logger.info('General information');
logger.warning('Something might be wrong');
logger.error('An error occurred', error);

// Show output channel
logger.show();

// Open log file
await logger.openLogFile();

// Clear logs
await logger.clearLogs();
```

### **Log File Rotation**

The log file grows with each session. To prevent excessive disk usage:
- Logs are stored per VS Code session
- Old session logs are automatically cleaned by VS Code
- Manually clear logs using the Clear Logs command

## 📚 Related Commands

| Command | Description |
|---------|-------------|
| `MCP Ollama: View Server Logs` | Show server output in Output panel |
| `MCP Ollama: Open Log File` | Open extension log file in editor |
| `MCP Ollama: Clear Logs` | Clear both output channel and log file |
| `MCP Ollama: Show Server Status` | View server status (includes log access) |

## 🆘 Getting Help

If you encounter issues:
1. Enable debug logging
2. Reproduce the issue
3. Open the log file
4. Share relevant log entries when reporting issues

For more information, visit the [GitHub repository](https://github.com/mcp-ollama/mcp-ollama-extension).
