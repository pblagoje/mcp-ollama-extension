import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

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
        this.outputChannel = vscode.window.createOutputChannel(channelName);
    }

    public initialize(context: vscode.ExtensionContext) {
        this.extensionContext = context;
        this.logFilePath = vscode.Uri.joinPath(context.logUri, 'mcp-ollama.log');

        // Read log level from configuration
        const config = vscode.workspace.getConfiguration('mcp-ollama');
        const configLevel = config.get<string>('extensionLogLevel', 'info');
        this.setLogLevel(configLevel);

        this.info('Logger initialized', { logFile: this.logFilePath.fsPath });
    }

    public setLogLevel(level: string) {
        switch (level.toLowerCase()) {
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
            default:
                this.currentLogLevel = LogLevel.INFO;
        }
    }

    private shouldLog(level: LogLevel): boolean {
        return level >= this.currentLogLevel;
    }

    private formatMessage(level: string, message: string, data?: any): string {
        const timestamp = new Date().toISOString();
        const dataStr = data ? ` | ${JSON.stringify(data)}` : '';
        return `[${timestamp}] [${level}] ${message}${dataStr}`;
    }

    private async writeToFile(message: string) {
        if (!this.logFilePath) {
            return;
        }

        try {
            const entry = message + '\n';
            let existingContent = '';

            try {
                const fileData = await vscode.workspace.fs.readFile(this.logFilePath);
                existingContent = Buffer.from(fileData).toString('utf-8');
            } catch {
                // File doesn't exist, will create new
            }

            const newContent = existingContent + entry;
            await vscode.workspace.fs.writeFile(this.logFilePath, Buffer.from(newContent, 'utf-8'));
        } catch (error) {
            // Silently fail to avoid infinite loop
            console.error('Failed to write to log file:', error);
        }
    }

    private log(level: LogLevel, levelName: string, message: string, data?: any) {
        if (!this.shouldLog(level)) {
            return;
        }

        const formattedMessage = this.formatMessage(levelName, message, data);

        // Write to OutputChannel
        this.outputChannel.appendLine(formattedMessage);

        // Write to file asynchronously
        this.writeToFile(formattedMessage);
    }

    public debug(message: string, data?: any) {
        this.log(LogLevel.DEBUG, 'DEBUG', message, data);
    }

    public info(message: string, data?: any) {
        this.log(LogLevel.INFO, 'INFO', message, data);
    }

    public warning(message: string, data?: any) {
        this.log(LogLevel.WARNING, 'WARNING', message, data);
    }

    public error(message: string, error?: any) {
        const errorData = error instanceof Error
            ? { message: error.message, stack: error.stack }
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
            vscode.window.showErrorMessage(`Failed to open log file: ${error}`);
        }
    }

    public async clearLogs() {
        this.outputChannel.clear();

        if (this.logFilePath) {
            try {
                await vscode.workspace.fs.writeFile(this.logFilePath, Buffer.from(''));
                this.info('Logs cleared');
            } catch (error) {
                this.error('Failed to clear log file', error);
            }
        }
    }

    public dispose() {
        this.outputChannel.dispose();
    }
}

// Singleton instance
export const logger = new Logger('MCP Ollama');
