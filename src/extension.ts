import * as vscode from 'vscode';
import { ChildProcess, spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { Logger } from './logger';
import { MCPOllamaClient } from './mcpClient';
import { OllamaModelsProvider } from './ollamaModelsProvider';

// Constants
const CONSTANTS = {
    AUTO_START_DELAY: 2000,
    STATUS_UPDATE_INTERVAL: 5000,
    GRACEFUL_SHUTDOWN_TIMEOUT: 5000,
    RESTART_DELAY: 2000,
    HEALTH_CHECK_TIMEOUT: 2000,
    SERVER_START_TIMEOUT: 10000,
    AXIOS_TIMEOUT: 5000
};

// Configuration interface
interface ServerConfig {
    pythonPath: string;
    serverHost: string;
    logLevel: string;
    autoStart: boolean;
}

// Global state
let mcpClient: MCPOllamaClient | null = null;
let statusBarItem: vscode.StatusBarItem;
let outputChannel: vscode.OutputChannel;
let statusUpdateInterval: NodeJS.Timeout | null = null;
let serverStartTimeout: NodeJS.Timeout | null = null;
let gracefulShutdownTimeout: NodeJS.Timeout | null = null;
let serverStartPromise: Promise<void> | null = null;
const logger = new Logger('MCP Ollama Extension');
let ollamaModelsProvider: OllamaModelsProvider;

// Platform detection
const isWindows = process.platform === 'win32';

export function activate(context: vscode.ExtensionContext) {
    // Initialize logger first
    logger.initialize(context);
    logger.info('MCP Ollama Extension activated');

    // Initialize components
    outputChannel = vscode.window.createOutputChannel('MCP Ollama Server');
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.command = 'mcp-ollama.showServerStatus';
    statusBarItem.show();

    // Register tree view provider
    ollamaModelsProvider = new OllamaModelsProvider();
    const treeView = vscode.window.registerTreeDataProvider('mcp-ollama.models', ollamaModelsProvider);
    const refreshModelsCommand = vscode.commands.registerCommand('mcp-ollama.refreshModels', () => ollamaModelsProvider.refresh());

    // Register commands
    const startCommand = vscode.commands.registerCommand('mcp-ollama.startServer', startServer);
    const stopCommand = vscode.commands.registerCommand('mcp-ollama.stopServer', stopServer);
    const restartCommand = vscode.commands.registerCommand('mcp-ollama.restartServer', restartServer);
    const statusCommand = vscode.commands.registerCommand('mcp-ollama.showServerStatus', showServerStatus);
    const configureCommand = vscode.commands.registerCommand('mcp-ollama.configureServer', configureServer);
    const logsCommand = vscode.commands.registerCommand('mcp-ollama.viewLogs', viewLogs);
    const modelsCommand = vscode.commands.registerCommand('mcp-ollama.listModels', listModels);
    const openLogFileCommand = vscode.commands.registerCommand('mcp-ollama.openLogFile', () => logger.openLogFile());
    const clearLogsCommand = vscode.commands.registerCommand('mcp-ollama.clearLogs', () => logger.clearLogs());

    // Ollama tool commands
    const chatCommand = vscode.commands.registerCommand('mcp-ollama.chatWithModel', chatWithModel);
    const generateCommand = vscode.commands.registerCommand('mcp-ollama.generateText', generateText);
    const embedCommand = vscode.commands.registerCommand('mcp-ollama.createEmbedding', createEmbedding);
    const showModelCommand = vscode.commands.registerCommand('mcp-ollama.showModelDetails', showModelDetails);
    const pullModelCommand = vscode.commands.registerCommand('mcp-ollama.pullModel', pullModel);
    const deleteModelCommand = vscode.commands.registerCommand('mcp-ollama.deleteModel', deleteModel);
    const runningModelsCommand = vscode.commands.registerCommand('mcp-ollama.listRunningModels', listRunningModels);

    // MCP Prompt commands
    const explainCodeCommand = vscode.commands.registerCommand('mcp-ollama.explainCode', explainCode);
    const writeDocstringCommand = vscode.commands.registerCommand('mcp-ollama.writeDocstring', writeDocstring);

    context.subscriptions.push(
        treeView,
        refreshModelsCommand,
        startCommand,
        stopCommand,
        restartCommand,
        statusCommand,
        configureCommand,
        logsCommand,
        modelsCommand,
        openLogFileCommand,
        clearLogsCommand,
        chatCommand,
        generateCommand,
        embedCommand,
        showModelCommand,
        pullModelCommand,
        deleteModelCommand,
        runningModelsCommand,
        explainCodeCommand,
        writeDocstringCommand,
        statusBarItem,
        outputChannel,
        logger
    );

    // Listen for configuration changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(async e => {
            if (e.affectsConfiguration('mcp-ollama.extensionLogLevel')) {
                const config = vscode.workspace.getConfiguration('mcp-ollama');
                const newLevel = config.get<string>('extensionLogLevel', 'info');
                logger.setLogLevel(newLevel);
                logger.info('Extension log level changed', { level: newLevel });
            }
            if (e.affectsConfiguration('mcp-ollama.logLevel')) {
                const config = vscode.workspace.getConfiguration('mcp-ollama');
                const newLevel = config.get<string>('logLevel', 'info');
                logger.info('Server log level setting changed', { level: newLevel });
                if (mcpClient && mcpClient.isConnected()) {
                    const choice = await vscode.window.showInformationMessage(
                        `Server log level changed to '${newLevel}'. Restart the MCP Ollama server to apply.`,
                        'Restart Now'
                    );
                    if (choice === 'Restart Now') {
                        await restartServer();
                    }
                }
            }
        })
    );

    // Auto-start if configured
    const config = getValidatedConfig();
    if (config.autoStart) {
        logger.info('Auto-start enabled, starting server', { delay: CONSTANTS.AUTO_START_DELAY });
        setTimeout(() => {
            startServer().catch(error => {
                const err = error instanceof Error ? error : new Error(String(error));
                logger.error('Auto-start failed', err);
                vscode.window.showErrorMessage(`Failed to auto-start MCP Ollama server: ${err.message}`);
            });
        }, CONSTANTS.AUTO_START_DELAY);
    }

    // Check mcp-ollama-python is installed (background, non-blocking)
    checkMcpModuleInstalled(config.pythonPath);

    // Update status periodically (clear any existing interval first)
    if (statusUpdateInterval) {
        clearInterval(statusUpdateInterval);
    }
    statusUpdateInterval = setInterval(updateServerStatus, CONSTANTS.STATUS_UPDATE_INTERVAL);
    logger.debug('Status update interval set', { interval: CONSTANTS.STATUS_UPDATE_INTERVAL });
}

/**
 * Silently checks if mcp-ollama-python is installed and offers to install it if not
 */
function checkMcpModuleInstalled(pythonPath: string): void {
    const check = spawn(pythonPath, ['-m', 'pip', 'show', 'mcp-ollama-python'], { stdio: 'pipe' });
    check.on('close', async (code) => {
        if (code !== 0) {
            logger.warning('mcp-ollama-python is not installed');
            const choice = await vscode.window.showWarningMessage(
                'mcp-ollama-python is not installed. The MCP Ollama server will not start without it.',
                'Install Now',
                'Dismiss'
            );
            if (choice === 'Install Now') {
                outputChannel.show();
                outputChannel.appendLine('Installing mcp-ollama-python...');
                const install = spawn(pythonPath, ['-m', 'pip', 'install', 'mcp-ollama-python'], { stdio: 'pipe' });
                install.stdout?.on('data', (d) => outputChannel.append(d.toString()));
                install.stderr?.on('data', (d) => outputChannel.append(d.toString()));
                install.on('close', (installCode) => {
                    if (installCode === 0) {
                        logger.info('mcp-ollama-python installed successfully');
                        vscode.window.showInformationMessage('mcp-ollama-python installed successfully.');
                    } else {
                        logger.error('Failed to install mcp-ollama-python', new Error(`Exit code ${installCode}`));
                        vscode.window.showErrorMessage('Failed to install mcp-ollama-python. Check the Output panel for details.');
                    }
                });
            }
        } else {
            logger.debug('mcp-ollama-python is installed');
        }
    });
    check.on('error', (err) => {
        logger.warning('Could not verify mcp-ollama-python installation', { error: err.message });
    });
}

/**
 * Validates and sanitizes a file system path
 */
async function validatePath(inputPath: string): Promise<boolean> {
    try {
        const resolvedPath = path.resolve(inputPath);
        const uri = vscode.Uri.file(resolvedPath);
        const stats = await vscode.workspace.fs.stat(uri);
        return stats.type === vscode.FileType.Directory;
    } catch (error) {
        logger.error('Path validation failed', { path: inputPath, error });
        return false;
    }
}

/**
 * Validates a file exists and is accessible
 */
async function validateFile(filePath: string): Promise<boolean> {
    try {
        const resolvedPath = path.resolve(filePath);
        const uri = vscode.Uri.file(resolvedPath);
        const stats = await vscode.workspace.fs.stat(uri);
        return stats.type === vscode.FileType.File;
    } catch (error) {
        logger.error('File validation failed', { path: filePath, error });
        return false;
    }
}

/**
 * Gets and validates configuration
 */
function getValidatedConfig(): ServerConfig {
    const config = vscode.workspace.getConfiguration('mcp-ollama');

    let pythonPath = config.get<string>('pythonPath', '');

    // Auto-detect Python if not configured
    if (!pythonPath) {
        // Try common Python commands in order
        if (isWindows) {
            pythonPath = 'py'; // Windows Python Launcher
        } else {
            pythonPath = 'python3'; // Unix-like systems prefer python3
        }
    }

    // Get serverHost from config, or fall back to OLLAMA_HOST env var, or default to localhost
    let serverHost = config.get<string>('serverHost', '');
    if (!serverHost) {
        const ollamaHost = process.env.OLLAMA_HOST;
        if (ollamaHost) {
            // Extract hostname from OLLAMA_HOST (e.g., http://ai:11434 -> ai)
            try {
                const url = new URL(ollamaHost);
                serverHost = url.hostname;
                logger.debug('Using OLLAMA_HOST environment variable', { ollamaHost, extracted: serverHost });
            } catch {
                // If not a valid URL, use as-is
                serverHost = ollamaHost.replace(/^https?:\/\//, '').split(':')[0];
                logger.debug('Using OLLAMA_HOST environment variable (parsed)', { ollamaHost, extracted: serverHost });
            }
        } else {
            serverHost = 'localhost';
        }
    }

    const logLevel = config.get<string>('logLevel', 'info');
    const autoStart = config.get<boolean>('autoStart', false);

    return {
        pythonPath,
        serverHost,
        logLevel,
        autoStart
    };
}

/**
 * Clears all active timeouts
 */
function clearAllTimeouts(): void {
    if (statusUpdateInterval) {
        clearInterval(statusUpdateInterval);
        statusUpdateInterval = null;
    }
    if (serverStartTimeout) {
        clearTimeout(serverStartTimeout);
        serverStartTimeout = null;
    }
    if (gracefulShutdownTimeout) {
        clearTimeout(gracefulShutdownTimeout);
        gracefulShutdownTimeout = null;
    }
}

export async function deactivate() {
    logger.info('MCP Ollama Extension deactivating');

    // Clear all timeouts and intervals
    clearAllTimeouts();

    // Disconnect MCP client
    if (mcpClient) {
        try {
            await mcpClient.disconnect();
            mcpClient = null;
        } catch (error) {
            logger.error('Failed to disconnect MCP client', error instanceof Error ? error : new Error(String(error)));
        }
    }

    // Dispose UI components
    if (statusBarItem) {
        statusBarItem.dispose();
    }
    if (outputChannel) {
        outputChannel.dispose();
    }
}

async function startServer() {
    if (mcpClient && mcpClient.isConnected()) {
        logger.warning('Attempted to start server while already running');
        vscode.window.showWarningMessage('MCP Ollama server is already running');
        return;
    }

    // Prevent concurrent server starts using a promise-based mutex
    if (serverStartPromise) {
        logger.warning('Server start already in progress');
        vscode.window.showWarningMessage('Server start already in progress');
        return serverStartPromise;
    }

    // Create the start promise
    serverStartPromise = (async () => {

    logger.info('Starting MCP Ollama server via MCP client...');

    const config = getValidatedConfig();
    const pythonPath = config.pythonPath;
    const host = config.serverHost;

    logger.info('MCP client configuration', {
        python: pythonPath,
        host: host,
        ollamaUrl: `http://${host}:11434`
    });

    outputChannel.clear();
    outputChannel.show();
    outputChannel.appendLine(`Starting MCP Ollama server via MCP SDK...`);
    outputChannel.appendLine(`Python: ${pythonPath}`);
    outputChannel.appendLine(`Ollama Host: ${host}`);

    try {
        // Validate Python path before use
        if (pythonPath && !pythonPath.match(/^(python|python3|py|[a-zA-Z]:[\\\\/]|[/~])/)) {
            throw new Error(`Invalid Python path: ${pythonPath}`);
        }

        // Check if mcp-ollama-python is installed
        const checkInstalled = spawn(pythonPath, ['-m', 'pip', 'show', 'mcp-ollama-python'], {
            stdio: 'pipe'
        });

        await new Promise<void>((resolve, reject) => {
            checkInstalled.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error('mcp-ollama-python is not installed'));
                } else {
                    resolve();
                }
            });
            checkInstalled.on('error', (error) => {
                reject(error);
            });
        });

        // Create and connect MCP client
        mcpClient = new MCPOllamaClient();

        logger.info('Connecting to MCP server...', {
            pythonPath,
            host,
            ollamaUrl: `http://${host}:11434`
        });

        await mcpClient.connect({
            pythonPath: pythonPath,
            scriptPath: '', // Not used - MCP SDK spawns via python -m
            host: host,
            port: 0 // Not used - MCP uses stdio
        });

        logger.info('MCP client connected successfully');
        outputChannel.appendLine('MCP server connected successfully!');
        outputChannel.appendLine(`Ollama will be queried at: http://${host}:11434`);

        // Set timeout for initial health check
        serverStartTimeout = setTimeout(async () => {
            logger.info('Performing initial health check');
            await updateServerStatus();
            serverStartTimeout = null;
        }, CONSTANTS.SERVER_START_TIMEOUT);

        // Note: MCP client manages the process internally via stdio transport
        // We don't have direct access to stdout/stderr, but the MCP SDK handles communication

        updateServerStatus();
        ollamaModelsProvider.setClient(mcpClient);
        logger.info('MCP server started successfully');
        vscode.window.showInformationMessage('MCP Ollama server started successfully');

    } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error('Failed to start MCP server', err);

        // Check if it's a missing package error
        if (err.message.includes('mcp-ollama-python is not installed')) {
            const install = await vscode.window.showErrorMessage(
                'mcp-ollama-python is not installed. Would you like to install it?',
                'Install Now',
                'Show Instructions',
                'Cancel'
            );

            if (install === 'Install Now') {
                outputChannel.appendLine('Installing mcp-ollama-python...');
                const installProcess = spawn(pythonPath, ['-m', 'pip', 'install', 'mcp-ollama-python'], {
                    stdio: 'pipe'
                });

                installProcess.stdout?.on('data', (data) => {
                    outputChannel.append(data.toString());
                });

                installProcess.stderr?.on('data', (data) => {
                    outputChannel.append(data.toString());
                });

                installProcess.on('close', (code) => {
                    if (code === 0) {
                        vscode.window.showInformationMessage('mcp-ollama-python installed successfully! Please try starting the server again.');
                    } else {
                        vscode.window.showErrorMessage('Failed to install mcp-ollama-python. Check the output for details.');
                    }
                });
            } else if (install === 'Show Instructions') {
                const instructions = `To install mcp-ollama-python manually, run:\n\n${pythonPath} -m pip install mcp-ollama-python`;
                vscode.window.showInformationMessage(instructions, { modal: true });
            }
        } else {
            vscode.window.showErrorMessage(`Failed to start server: ${err.message}`);
        }

        // Clean up on failure
        if (mcpClient) {
            try {
                await mcpClient.disconnect();
            } catch (disconnectError) {
                logger.error('Failed to disconnect MCP client after error', disconnectError instanceof Error ? disconnectError : new Error(String(disconnectError)));
            }
            mcpClient = null;
        }

        if (serverStartTimeout) {
            clearTimeout(serverStartTimeout);
            serverStartTimeout = null;
        }
    } finally {
        serverStartPromise = null;
    }
    })();

    return serverStartPromise;
}

async function stopServer() {
    if (!mcpClient || !mcpClient.isConnected()) {
        logger.warning('Attempted to stop server while not running');
        vscode.window.showWarningMessage('MCP Ollama server is not running');
        return;
    }

    logger.info('Stopping MCP Ollama server...');
    outputChannel.appendLine('Stopping MCP Ollama server...');

    try {
        await mcpClient.disconnect();
        mcpClient = null;

        // Clear timeouts
        if (serverStartTimeout) {
            clearTimeout(serverStartTimeout);
            serverStartTimeout = null;
        }
        if (gracefulShutdownTimeout) {
            clearTimeout(gracefulShutdownTimeout);
            gracefulShutdownTimeout = null;
        }

        updateServerStatus();
        ollamaModelsProvider.setClient(null);
        logger.info('MCP server stopped successfully');
        vscode.window.showInformationMessage('MCP Ollama server stopped');

    } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error('Failed to stop MCP server', err);
        vscode.window.showErrorMessage(`Failed to stop server: ${err.message}`);
    }
}

async function restartServer() {
    logger.info('Restarting server...');
    await stopServer();
    setTimeout(() => startServer(), CONSTANTS.RESTART_DELAY);
}

async function showServerStatus() {
    logger.debug('Showing server status');
    const config = getValidatedConfig();

    const isRunning = await checkServerHealth();
    logger.debug('Server health check result', { isRunning });

    const status = isRunning ? 'Running' : 'Stopped';
    const icon = isRunning ? '✅' : '❌';

    const message = `
${icon} MCP Ollama Server Status

Status: ${isRunning ? 'Running ✓' : 'Stopped ✗'}
Ollama Host: http://${config.serverHost}:11434
MCP Client: ${mcpClient && mcpClient.isConnected() ? 'Connected' : 'Not connected'}
Configuration:
  - Python Path: ${config.pythonPath || 'Auto-detect'}
  - Ollama Host: ${config.serverHost}
  - Log Level: ${config.logLevel}
  - Auto Start: ${config.autoStart}
    `.trim();

    vscode.window.showInformationMessage(message, 'View Logs').then(choice => {
        if (choice === 'View Logs') {
            viewLogs();
        }
    });
}

async function configureServer() {
    logger.info('Opening server configuration');
    const vsConfig = vscode.workspace.getConfiguration('mcp-ollama');

    const options = [
        'Python Path',
        'Ollama Host',
        'Log Level',
        'Auto Start'
    ];

    const selected = await vscode.window.showQuickPick(options, {
        placeHolder: 'Select configuration to modify'
    });

    if (!selected) {
        return;
    }

    switch (selected) {
        case 'Python Path': {
            const pythonPath = await vscode.window.showInputBox({
                prompt: 'Enter path to Python executable (leave empty for auto-detect)',
                value: vsConfig.get<string>('pythonPath', ''),
                placeHolder: 'Auto-detect: py (Windows) or python3 (Unix)'
            });
            if (pythonPath !== undefined) {
                try {
                    await vsConfig.update('pythonPath', pythonPath, vscode.ConfigurationTarget.Global);
                    logger.info('Python path updated', { path: pythonPath || 'auto-detect' });
                    vscode.window.showInformationMessage('Python path updated');
                } catch (error) {
                    logger.error('Failed to update Python path', error instanceof Error ? error : new Error(String(error)));
                    vscode.window.showErrorMessage('Failed to update Python path');
                }
            }
            break;
        }
        case 'Ollama Host': {
            const resolvedHost = getValidatedConfig().serverHost;
            const host = await vscode.window.showInputBox({
                prompt: 'Enter Ollama hostname or IP address',
                value: resolvedHost,
                placeHolder: 'e.g., localhost, ai, 192.168.1.100',
                validateInput: (value: string) => {
                    if (!value || value.trim().length === 0) {
                        return null; // Allow empty for default
                    }
                    // Remove protocol if present
                    const cleanValue = value.replace(/^https?:\/\//, '');
                    // Validate hostname/IP format (basic validation)
                    const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$|^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$/;
                    if (!hostnameRegex.test(cleanValue.split(':')[0])) {
                        return 'Invalid hostname or IP address format';
                    }
                    return null;
                }
            });
            if (host) {
                try {
                    // Clean the host value (remove protocol if present)
                    const cleanHost = host.replace(/^https?:\/\//, '').split(':')[0];
                    await vsConfig.update('serverHost', cleanHost, vscode.ConfigurationTarget.Global);
                    logger.info('Ollama host updated', { host: cleanHost });
                    vscode.window.showInformationMessage('Ollama host updated');
                } catch (error) {
                    logger.error('Failed to update Ollama host', error instanceof Error ? error : new Error(String(error)));
                    vscode.window.showErrorMessage('Failed to update Ollama host');
                }
            }
            break;
        }
        case 'Log Level': {
            const logLevels: vscode.QuickPickItem[] = [
                { label: 'debug', description: 'Show all debug information' },
                { label: 'info', description: 'Show general information' },
                { label: 'warning', description: 'Show warnings and errors' },
                { label: 'error', description: 'Show only errors' }
            ];

            const logLevel = await vscode.window.showQuickPick(logLevels, {
                placeHolder: 'Select log level'
            });
            if (logLevel) {
                try {
                    await vsConfig.update('logLevel', logLevel.label, vscode.ConfigurationTarget.Global);
                    logger.info('Server log level updated', { level: logLevel.label });
                    vscode.window.showInformationMessage('Log level updated');
                } catch (error) {
                    logger.error('Failed to save log level', error instanceof Error ? error : new Error(String(error)));
                    vscode.window.showErrorMessage('Failed to save configuration');
                }
            }
            break;
        }
        case 'Auto Start': {
            const config = getValidatedConfig();
            const currentAutoStart = config.autoStart;
            try {
                await vsConfig.update('autoStart', !currentAutoStart, vscode.ConfigurationTarget.Global);
                logger.info('Auto start toggled', { enabled: !currentAutoStart });
                vscode.window.showInformationMessage(`Auto start ${!currentAutoStart ? 'enabled' : 'disabled'}`);
            } catch (error) {
                logger.error('Failed to save auto start setting', error instanceof Error ? error : new Error(String(error)));
                vscode.window.showErrorMessage('Failed to save configuration');
            }
            break;
        }
    }
}

function viewLogs() {
    logger.debug('Showing server output channel');
    outputChannel.show();
}

async function listModels() {
    logger.info('Fetching available models from MCP server');

    if (!mcpClient || !mcpClient.isConnected()) {
        vscode.window.showErrorMessage('MCP server is not connected. Please start the server first.');
        return;
    }

    try {
        const models = await mcpClient.listModels();
        logger.info('Models fetched via MCP', { count: models.length });

        if (models.length === 0) {
            logger.warning('No models available');
            vscode.window.showInformationMessage('No models available');
            return;
        }

        const modelItems: vscode.QuickPickItem[] = models.map((model: any) => {
            const sizeGB = model.size ? (model.size / 1024 / 1024 / 1024).toFixed(2) : 'Unknown';
            const modifiedDate = model.modified_at ? new Date(model.modified_at).toLocaleString() : 'Unknown';
            return {
                label: model.name || 'Unknown',
                description: `${sizeGB} GB`,
                detail: `Modified: ${modifiedDate}`
            };
        });

        const selected = await vscode.window.showQuickPick(modelItems, {
            placeHolder: 'Select a model to view details',
            title: 'Available Ollama Models'
        });

        if (selected) {
            const model = models.find((m: any) => m.name === selected.label);
            if (model) {
                const sizeGB = model.size ? (model.size / 1024 / 1024 / 1024).toFixed(2) : 'Unknown';
                const modifiedDate = model.modified_at ? new Date(model.modified_at).toLocaleString() : 'Unknown';
                const details = `
Model: ${model.name || 'Unknown'}
Size: ${sizeGB} GB
Digest: ${model.digest || 'Unknown'}
Modified: ${modifiedDate}
                `.trim();

                vscode.window.showInformationMessage(details, { modal: true });
            }
        }
    } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error('Failed to fetch models via MCP', err);
        const errorMessage = err.message;

        // Show detailed error to help diagnose MCP server issues
        if (errorMessage.includes('Failed to parse MCP response')) {
            vscode.window.showErrorMessage(
                `MCP server returned an error instead of model data. Check that:\n1. Ollama is running at http://${getValidatedConfig().serverHost}:11434\n2. The MCP server can connect to Ollama\n\nError: ${errorMessage}`,
                'View Logs'
            ).then(choice => {
                if (choice === 'View Logs') {
                    viewLogs();
                }
            });
        } else {
            vscode.window.showErrorMessage(`Failed to fetch models: ${errorMessage}`);
        }
    }
}

async function updateServerStatus() {
    const isRunning = await checkServerHealth();

    if (isRunning) {
        statusBarItem.text = '$(circle-filled) MCP Ollama';
        statusBarItem.tooltip = 'MCP Ollama Server - Running';
        statusBarItem.color = undefined;
        vscode.commands.executeCommand('setContext', 'mcp-ollama.serverRunning', true);
    } else {
        statusBarItem.text = '$(circle-outline) MCP Ollama';
        statusBarItem.tooltip = 'MCP Ollama Server - Stopped';
        statusBarItem.color = new vscode.ThemeColor('statusBarItem.warningForeground');
        vscode.commands.executeCommand('setContext', 'mcp-ollama.serverRunning', false);
    }
}

/**
 * Helper function to get available models with error handling
 */
async function getAvailableModels(): Promise<any[]> {
    if (!mcpClient || !mcpClient.isConnected()) {
        throw new Error('MCP server is not connected');
    }

    const models = await mcpClient.listModels();
    if (models.length === 0) {
        throw new Error('No models available');
    }

    return models;
}

async function checkServerHealth(): Promise<boolean> {
    // Check if MCP client is connected
    // The MCP client being connected means the server is running
    // Even if Ollama queries fail, the MCP server itself is operational
    const isConnected = mcpClient !== null && mcpClient.isConnected();

    if (isConnected) {
        logger.debug('MCP server health check passed - client connected');
    } else {
        logger.debug('MCP server health check failed - client not connected');
    }

    return isConnected;
}

async function chatWithModel(preSelectedModel?: string) {
    try {
        let modelName = preSelectedModel;
        if (!modelName) {
            const models = await getAvailableModels();
            modelName = await vscode.window.showQuickPick(
                models.map((m: any) => m.name),
                { placeHolder: 'Select a model to chat with' }
            );
        }

        if (!modelName) {
            return;
        }

        const userMessage = await vscode.window.showInputBox({
            prompt: 'Enter your message',
            placeHolder: 'Type your message here...'
        });

        if (!userMessage) {
            return;
        }

        const messages = [{ role: 'user', content: userMessage }];

        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Chatting with ${modelName}...`,
            cancellable: false
        }, async () => {
            if (!mcpClient || !mcpClient.isConnected()) {
                throw new Error('MCP client disconnected during operation');
            }
            logger.debug('Calling chat', { model: modelName });
            const response = await mcpClient.chat(modelName!, messages);
            const responseText = response.message?.content || JSON.stringify(response, null, 2);

            const doc = await vscode.workspace.openTextDocument({
                content: `# Chat with ${modelName}\n\n## Your message:\n${userMessage}\n\n## Response:\n${responseText}`,
                language: 'markdown'
            });
            await vscode.window.showTextDocument(doc);
        });
    } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error('Failed to chat with model', err);
        if (err.message.includes('not connected')) {
            vscode.window.showErrorMessage('MCP server is not connected. Please start the server first.');
        } else if (err.message.includes('No models')) {
            vscode.window.showWarningMessage('No models available');
        } else {
            vscode.window.showErrorMessage(`Failed to chat: ${err.message}`);
        }
    }
}

async function generateText() {
    try {
        const models = await getAvailableModels();

        const modelName = await vscode.window.showQuickPick(
            models.map((m: any) => m.name),
            { placeHolder: 'Select a model for text generation' }
        );

        if (!modelName) {
            return;
        }

        const prompt = await vscode.window.showInputBox({
            prompt: 'Enter your prompt',
            placeHolder: 'Type your prompt here...'
        });

        if (!prompt) {
            return;
        }

        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Generating text with ${modelName}...`,
            cancellable: false
        }, async () => {
            if (!mcpClient || !mcpClient.isConnected()) {
                throw new Error('MCP client disconnected during operation');
            }
            logger.debug('Calling generate', { model: modelName });
            const response = await mcpClient.generate(modelName, prompt);
            const responseText = response.response || JSON.stringify(response, null, 2);

            const doc = await vscode.workspace.openTextDocument({
                content: `# Text Generation with ${modelName}\n\n## Prompt:\n${prompt}\n\n## Generated:\n${responseText}`,
                language: 'markdown'
            });
            await vscode.window.showTextDocument(doc);
        });
    } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error('Failed to generate text', err);
        if (err.message.includes('not connected')) {
            vscode.window.showErrorMessage('MCP server is not connected. Please start the server first.');
        } else if (err.message.includes('No models')) {
            vscode.window.showWarningMessage('No models available');
        } else {
            vscode.window.showErrorMessage(`Failed to generate text: ${err.message}`);
        }
    }
}

async function createEmbedding() {
    if (!mcpClient || !mcpClient.isConnected()) {
        vscode.window.showErrorMessage('MCP server is not connected. Please start the server first.');
        return;
    }

    try {
        const models = await mcpClient.listModels();
        const embeddingModels = models.filter((m: any) => m.name.includes('embed'));

        if (embeddingModels.length === 0) {
            vscode.window.showWarningMessage('No embedding models available. Try pulling nomic-embed-text.');
            return;
        }

        const modelName = await vscode.window.showQuickPick(
            embeddingModels.map((m: any) => m.name),
            { placeHolder: 'Select an embedding model' }
        );

        if (!modelName) {
            return;
        }

        const text = await vscode.window.showInputBox({
            prompt: 'Enter text to embed',
            placeHolder: 'Type your text here...'
        });

        if (!text) {
            return;
        }

        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Creating embedding with ${modelName}...`,
            cancellable: false
        }, async () => {
            if (!mcpClient || !mcpClient.isConnected()) {
                throw new Error('MCP client disconnected during operation');
            }
            logger.debug('Calling embed', { model: modelName });
            const response = await mcpClient.embed(modelName, text);
            const embedding = response.embedding || response.embeddings?.[0] || response;

            const doc = await vscode.workspace.openTextDocument({
                content: `# Embedding with ${modelName}\n\n## Text:\n${text}\n\n## Embedding:\n${JSON.stringify(embedding, null, 2)}`,
                language: 'markdown'
            });
            await vscode.window.showTextDocument(doc);
        });
    } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error('Failed to create embedding', err);
        vscode.window.showErrorMessage(`Failed to create embedding: ${err.message}`);
    }
}

async function showModelDetails() {
    try {
        const models = await getAvailableModels();

        const modelName = await vscode.window.showQuickPick(
            models.map((m: any) => m.name),
            { placeHolder: 'Select a model to inspect' }
        );

        if (!modelName) {
            return;
        }

        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Fetching details for ${modelName}...`,
            cancellable: false
        }, async () => {
            if (!mcpClient || !mcpClient.isConnected()) {
                throw new Error('MCP client disconnected during operation');
            }
            logger.debug('Calling showModel', { model: modelName });
            const details = await mcpClient.showModel(modelName);

            const doc = await vscode.workspace.openTextDocument({
                content: `# Model Details: ${modelName}\n\n\`\`\`json\n${JSON.stringify(details, null, 2)}\n\`\`\``,
                language: 'markdown'
            });
            await vscode.window.showTextDocument(doc);
        });
    } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error('Failed to show model details', err);
        if (err.message.includes('not connected')) {
            vscode.window.showErrorMessage('MCP server is not connected. Please start the server first.');
        } else if (err.message.includes('No models')) {
            vscode.window.showWarningMessage('No models available');
        } else {
            vscode.window.showErrorMessage(`Failed to show model details: ${err.message}`);
        }
    }
}

async function pullModel() {
    if (!mcpClient || !mcpClient.isConnected()) {
        vscode.window.showErrorMessage('MCP server is not connected. Please start the server first.');
        return;
    }

    const modelName = await vscode.window.showInputBox({
        prompt: 'Enter model name to pull',
        placeHolder: 'e.g., llama3.2, mistral, codellama'
    });

    if (!modelName) {
        return;
    }

    try {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Pulling model ${modelName}...`,
            cancellable: false
        }, async () => {
            if (!mcpClient || !mcpClient.isConnected()) {
                throw new Error('MCP client disconnected during operation');
            }
            const result = await mcpClient.pullModel(modelName);
            vscode.window.showInformationMessage(`Successfully pulled model: ${modelName}`);
            ollamaModelsProvider.refresh();
            logger.info('Model pulled successfully', { model: modelName, result });
        });
    } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error('Failed to pull model', err);
        vscode.window.showErrorMessage(`Failed to pull model: ${err.message}`);
    }
}

async function deleteModel() {
    if (!mcpClient || !mcpClient.isConnected()) {
        vscode.window.showErrorMessage('MCP server is not connected. Please start the server first.');
        return;
    }

    try {
        const models = await mcpClient.listModels();
        if (models.length === 0) {
            vscode.window.showWarningMessage('No models available');
            return;
        }

        const modelName = await vscode.window.showQuickPick(
            models.map((m: any) => m.name),
            { placeHolder: 'Select a model to delete' }
        );

        if (!modelName) {
            return;
        }

        const confirm = await vscode.window.showWarningMessage(
            `Are you sure you want to delete model "${modelName}"?`,
            { modal: true },
            'Delete'
        );

        if (confirm !== 'Delete') {
            return;
        }

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Deleting model ${modelName}...`,
            cancellable: false
        }, async () => {
            if (!mcpClient || !mcpClient.isConnected()) {
                throw new Error('MCP client disconnected during operation');
            }
            await mcpClient.deleteModel(modelName);
            vscode.window.showInformationMessage(`Successfully deleted model: ${modelName}`);
            ollamaModelsProvider.refresh();
            logger.info('Model deleted successfully', { model: modelName });
        });
    } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error('Failed to delete model', err);
        vscode.window.showErrorMessage(`Failed to delete model: ${err.message}`);
    }
}

async function listRunningModels() {
    if (!mcpClient || !mcpClient.isConnected()) {
        vscode.window.showErrorMessage('MCP server is not connected. Please start the server first.');
        return;
    }

    try {
        const running = await mcpClient.listRunningModelsViaTool();
        const models = running.models || [];

        if (models.length === 0) {
            vscode.window.showInformationMessage('No models currently running');
            return;
        }

        const modelInfo = models.map((m: any) => {
            const sizeGB = m.size_vram ? (m.size_vram / 1024 / 1024 / 1024).toFixed(2) : 'N/A';
            const modelName = m.name || 'Unknown';
            return `${modelName} - ${sizeGB} GB VRAM`;
        }).join('\n');

        vscode.window.showInformationMessage(
            `Running Models (${models.length}):\n\n${modelInfo}`,
            { modal: true }
        );
    } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error('Failed to list running models', err);
        vscode.window.showErrorMessage(`Failed to list running models: ${err.message}`);
    }
}

// MCP Prompt command handlers

async function explainCode() {
    if (!mcpClient || !mcpClient.isConnected()) {
        vscode.window.showErrorMessage('MCP server is not connected. Please start the server first.');
        return;
    }

    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor. Please open a file and select code to explain.');
        return;
    }

    const selection = editor.selection;
    const code = editor.document.getText(selection.isEmpty ? undefined : selection);

    if (!code.trim()) {
        vscode.window.showErrorMessage('No code selected. Please select code to explain.');
        return;
    }

    const language = editor.document.languageId;

    try {
        // Get the prompt from MCP server
        const promptResult = await mcpClient.getPrompt('explain_code', { code, language });
        const promptText = promptResult.messages?.[0]?.content?.text || '';

        if (!promptText) {
            vscode.window.showErrorMessage('Failed to generate explanation prompt');
            return;
        }

        // Select a model to use
        const models = await mcpClient.listModels();
        if (models.length === 0) {
            vscode.window.showWarningMessage('No models available');
            return;
        }

        const modelName = await vscode.window.showQuickPick(
            models.map((m: any) => m.name),
            { placeHolder: 'Select a model to explain the code' }
        );

        if (!modelName) {
            return;
        }

        // Generate explanation using the selected model
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Explaining code with ${modelName}...`,
            cancellable: false
        }, async () => {
            if (!mcpClient || !mcpClient.isConnected()) {
                throw new Error('MCP client disconnected during operation');
            }
            logger.debug('Calling generate (explainCode)', { model: modelName });
            const response = await mcpClient.generate(modelName, promptText);
            const explanation = response.response || JSON.stringify(response, null, 2);

            const doc = await vscode.workspace.openTextDocument({
                content: `# Code Explanation (${language})\n\n## Original Code:\n\`\`\`${language}\n${code}\n\`\`\`\n\n## Explanation:\n${explanation}`,
                language: 'markdown'
            });
            await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
        });
    } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error('Failed to explain code', err);
        vscode.window.showErrorMessage(`Failed to explain code: ${err.message}`);
    }
}

async function writeDocstring() {
    if (!mcpClient || !mcpClient.isConnected()) {
        vscode.window.showErrorMessage('MCP server is not connected. Please start the server first.');
        return;
    }

    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor. Please open a file and select code to document.');
        return;
    }

    const selection = editor.selection;
    const code = editor.document.getText(selection.isEmpty ? undefined : selection);

    if (!code.trim()) {
        vscode.window.showErrorMessage('No code selected. Please select a function or class to document.');
        return;
    }

    const language = editor.document.languageId;

    // Ask for documentation style
    const styles: Record<string, string[]> = {
        python: ['google', 'numpy', 'sphinx'],
        javascript: ['jsdoc'],
        typescript: ['jsdoc', 'tsdoc'],
        java: ['javadoc'],
        csharp: ['xml']
    };

    const availableStyles = styles[language] || [];
    let style = '';

    if (availableStyles.length > 0) {
        const selectedStyle = await vscode.window.showQuickPick(
            availableStyles,
            { placeHolder: `Select documentation style for ${language}` }
        );
        style = selectedStyle || '';
    }

    try {
        // Get the prompt from MCP server
        const args: Record<string, string> = { code, language };
        if (style) {
            args.style = style;
        }

        const promptResult = await mcpClient.getPrompt('write_docstring', args);
        const promptText = promptResult.messages?.[0]?.content?.text || '';

        if (!promptText) {
            vscode.window.showErrorMessage('Failed to generate docstring prompt');
            return;
        }

        // Select a model to use
        const models = await mcpClient.listModels();
        if (models.length === 0) {
            vscode.window.showWarningMessage('No models available');
            return;
        }

        const modelName = await vscode.window.showQuickPick(
            models.map((m: any) => m.name),
            { placeHolder: 'Select a model to generate documentation' }
        );

        if (!modelName) {
            return;
        }

        // Generate docstring using the selected model
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Generating docstring with ${modelName}...`,
            cancellable: false
        }, async () => {
            if (!mcpClient || !mcpClient.isConnected()) {
                throw new Error('MCP client disconnected during operation');
            }
            logger.debug('Calling generate (writeDocstring)', { model: modelName });
            const response = await mcpClient.generate(modelName, promptText);
            const docstring = response.response || JSON.stringify(response, null, 2);

            const doc = await vscode.workspace.openTextDocument({
                content: `# Generated Documentation (${language}${style ? ` - ${style}` : ''})\n\n## Original Code:\n\`\`\`${language}\n${code}\n\`\`\`\n\n## Documentation:\n\`\`\`${language}\n${docstring}\n\`\`\``,
                language: 'markdown'
            });
            await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
        });
    } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error('Failed to write docstring', err);
        vscode.window.showErrorMessage(`Failed to write docstring: ${err.message}`);
    }
}
