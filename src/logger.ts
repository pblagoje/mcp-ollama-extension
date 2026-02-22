import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';

// Constants
const MAX_LOG_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_SANITIZE_DEPTH = 10;
const SENSITIVE_KEYS = ['password', 'token', 'apiKey', 'apiSecret', 'api_key', 'api_secret', 'accessToken', 'refreshToken'];

// Types
type LogData = Record<string, any>;

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARNING = 2,
    ERROR = 3
}

export class Logger {
    private outputChannel: vscode.OutputChannel;
    private logFilePath: vscode.Uri | null = null;
    private currentLogLevel: LogLevel = LogLevel.INFO;
    private extensionContext: vscode.ExtensionContext | null = null;

    constructor(channelName: string) {
        if (!channelName || channelName.trim().length === 0) {
            throw new Error('Channel name cannot be empty');
        }
        this.outputChannel = vscode.window.createOutputChannel(channelName);
    }

    /**
     * Validates log file path for security
     */
    private validateLogPath(logPath: string, expectedBasePath: string): boolean {
        try {
            // Resolve both paths to absolute paths
            const resolvedLogPath = path.resolve(logPath);
            const resolvedBasePath = path.resolve(expectedBasePath);

            // Normalize paths for case-insensitive comparison on Windows
            const normalizedLogPath = process.platform === 'win32' ? resolvedLogPath.toLowerCase() : resolvedLogPath;
            const normalizedBasePath = process.platform === 'win32' ? resolvedBasePath.toLowerCase() : resolvedBasePath;

            // Check if log path is within the expected base path
            return normalizedLogPath.startsWith(normalizedBasePath);
        } catch (error) {
            console.error('Path validation error:', error);
            return false;
        }
    }

    /**
     * Sanitizes sensitive data from log output
     */
    private sanitizeData(data: any, depth: number = 0, visited: WeakSet<object> = new WeakSet()): any {
        // Prevent infinite recursion and stack overflow
        if (depth > MAX_SANITIZE_DEPTH) {
            return '[Max depth reached]';
        }

        if (data === null || data === undefined) {
            return data;
        }

        if (typeof data !== 'object') {
            return data;
        }

        // Detect circular references
        if (visited.has(data)) {
            return '[Circular Reference]';
        }
        visited.add(data);

        if (Array.isArray(data)) {
            return data.map(item => this.sanitizeData(item, depth + 1, visited));
        }

        const sanitized: any = {};
        for (const [key, value] of Object.entries(data)) {
            // Check if key is sensitive
            if (SENSITIVE_KEYS.some(sensitiveKey => key.toLowerCase().includes(sensitiveKey.toLowerCase()))) {
                sanitized[key] = '***REDACTED***';
            } else if (typeof value === 'object' && value !== null) {
                sanitized[key] = this.sanitizeData(value, depth + 1, visited);
            } else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    }

    /**
     * Rotates log file if it exceeds maximum size
     */
    private async rotateLogIfNeeded(): Promise<void> {
        if (!this.logFilePath) {
            return;
        }

        try {
            const stats = await fs.stat(this.logFilePath.fsPath);

            if (stats.size > MAX_LOG_FILE_SIZE) {
                const backupPath = this.logFilePath.fsPath + '.old';
                await fs.rename(this.logFilePath.fsPath, backupPath);
                // Use console.log to avoid recursion - don't call this.info() during rotation
                console.log(`[Logger] Log file rotated: ${stats.size} bytes -> ${backupPath}`);
            }
        } catch (error) {
            // File doesn't exist yet or other error - safe to ignore
            console.error('Failed to rotate log:', error);
        }
    }

    public initialize(context: vscode.ExtensionContext) {
        if (!context) {
            throw new Error('Extension context is required');
        }

        this.extensionContext = context;
        this.logFilePath = vscode.Uri.joinPath(context.logUri, 'mcp-ollama.log');

        if (!this.logFilePath) {
            throw new Error('Failed to create log file path');
        }

        // Validate log path for security - ensure it's within the extension's log directory
        if (!this.validateLogPath(this.logFilePath.fsPath, context.logUri.fsPath)) {
            throw new Error('Invalid log file path detected');
        }

        // Read log level from configuration
        const config = vscode.workspace.getConfiguration('mcp-ollama');
        const configLevel = config.get<string>('extensionLogLevel', 'info');
        this.setLogLevel(configLevel);

        this.info('Logger initialized', { logFile: this.logFilePath.fsPath });
    }

    public setLogLevel(level: string) {
        const validLevels = ['debug', 'info', 'warning', 'error'];
        const normalizedLevel = level.toLowerCase();

        if (!validLevels.includes(normalizedLevel)) {
            console.warn(`Invalid log level '${level}' provided, defaulting to INFO`);
            this.currentLogLevel = LogLevel.INFO;
            return;
        }

        switch (normalizedLevel) {
            case 'debug':
                this.currentLogLevel = LogLevel.DEBUG;
                break;
            case 'info':
                this.currentLogLevel = LogLevel.INFO;
                break;
            case 'warning':
                this.currentLogLevel = LogLevel.WARNING;
                break;
            case 'error':
                this.currentLogLevel = LogLevel.ERROR;
                break;
        }
    }

    private shouldLog(level: LogLevel): boolean {
        return level >= this.currentLogLevel;
    }

    private formatMessage(level: string, message: string, data?: LogData): string {
        const timestamp = new Date().toISOString();
        let dataStr = '';

        if (data) {
            try {
                const sanitizedData = this.sanitizeData(data);
                dataStr = ` | ${JSON.stringify(sanitizedData)}`;
            } catch (error) {
                dataStr = ' | [Error serializing data]';
                console.error('Failed to serialize log data:', error);
            }
        }

        return `[${timestamp}] [${level}] ${message}${dataStr}`;
    }

    private async writeToFile(message: string): Promise<void> {
        if (!this.logFilePath) {
            return;
        }

        try {
            // Check if rotation is needed before writing
            await this.rotateLogIfNeeded();

            const entry = message + '\n';

            // Use Node.js fs.appendFile for efficient appending (doesn't read entire file)
            await fs.appendFile(this.logFilePath.fsPath, entry, 'utf-8');
        } catch (error) {
            // Log to console to avoid recursion
            console.error('Failed to write to log file:', error);
        }
    }

    private log(level: LogLevel, levelName: string, message: string, data?: LogData) {
        if (!this.shouldLog(level)) {
            return;
        }

        const formattedMessage = this.formatMessage(levelName, message, data);

        // Write to OutputChannel
        this.outputChannel.appendLine(formattedMessage);

        // Write to file asynchronously (don't await to avoid blocking)
        this.writeToFile(formattedMessage).catch(error => {
            console.error('Async log write failed:', error);
        });
    }

    public debug(message: string, data?: LogData) {
        this.log(LogLevel.DEBUG, 'DEBUG', message, data);
    }

    public info(message: string, data?: LogData) {
        this.log(LogLevel.INFO, 'INFO', message, data);
    }

    public warning(message: string, data?: LogData) {
        this.log(LogLevel.WARNING, 'WARNING', message, data);
    }

    public error(message: string, error?: Error | LogData) {
        const errorData = error instanceof Error
            ? { message: error.message, stack: error.stack, name: error.name }
            : error;
        this.log(LogLevel.ERROR, 'ERROR', message, errorData);
    }

    public show() {
        this.outputChannel.show();
    }

    public async openLogFile() {
        if (!this.logFilePath) {
            vscode.window.showWarningMessage('Log file not initialized');
            return;
        }

        try {
            // Ensure file exists
            try {
                await vscode.workspace.fs.stat(this.logFilePath);
            } catch {
                // Create empty file if it doesn't exist
                await vscode.workspace.fs.writeFile(this.logFilePath, Buffer.from(''));
            }

            const document = await vscode.workspace.openTextDocument(this.logFilePath);
            await vscode.window.showTextDocument(document);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Failed to open log file: ${errorMessage}`);
        }
    }

    public async clearLogs() {
        this.outputChannel.clear();

        if (this.logFilePath) {
            try {
                await vscode.workspace.fs.writeFile(this.logFilePath, Buffer.from(''));
                this.info('Logs cleared');
            } catch (error) {
                this.error('Failed to clear log file', error instanceof Error ? error : { error: String(error) });
            }
        }
    }

    public dispose() {
        try {
            this.outputChannel.dispose();
        } catch (error) {
            console.error('Error disposing logger:', error);
        }
    }
}

// Singleton instance
export const logger = new Logger('MCP Ollama');
