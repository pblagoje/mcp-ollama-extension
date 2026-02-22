import * as vscode from 'vscode';
import { ChildProcess, spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import axios from 'axios';
import { logger } from './logger';

let serverProcess: ChildProcess | null = null;
let statusBarItem: vscode.StatusBarItem;
let outputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
    // Initialize logger first
    logger.initialize(context);
    logger.info('MCP Ollama Extension activated');

    // Initialize components
    outputChannel = vscode.window.createOutputChannel('MCP Ollama Server');
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.command = 'mcp-ollama.showServerStatus';
    statusBarItem.show();

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

    context.subscriptions.push(
        startCommand,
        stopCommand,
        restartCommand,
        statusCommand,
        configureCommand,
        logsCommand,
        modelsCommand,
        openLogFileCommand,
        clearLogsCommand,
        statusBarItem,
        outputChannel,
        logger
    );

    // Listen for configuration changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('mcp-ollama.extensionLogLevel')) {
                const config = vscode.workspace.getConfiguration('mcp-ollama');
                const newLevel = config.get<string>('extensionLogLevel', 'info');
                logger.setLogLevel(newLevel);
                logger.info('Extension log level changed', { level: newLevel });
            }
        })
    );

    // Auto-start if configured
    const config = vscode.workspace.getConfiguration('mcp-ollama');
    if (config.get('autoStart')) {
        logger.info('Auto-start enabled, starting server in 2 seconds');
        setTimeout(() => startServer(), 2000);
    }

    // Update status periodically
    setInterval(updateServerStatus, 5000);
    logger.debug('Status update interval set to 5 seconds');
}

export function deactivate() {
    logger.info('Extension deactivating');
    if (serverProcess) {
        logger.info('Killing server process');
        serverProcess.kill();
        serverProcess = null;
    }
    if (statusBarItem) {
        statusBarItem.dispose();
    }
    if (outputChannel) {
        outputChannel.dispose();
    }
}

async function startServer() {
    if (serverProcess) {
        logger.warning('Attempted to start server while already running');
        vscode.window.showWarningMessage('MCP Ollama server is already running');
        return;
    }

    logger.info('Starting MCP Ollama server...');

    const config = vscode.workspace.getConfiguration('mcp-ollama');
    let serverPath = config.get<string>('serverPath');
    const pythonPath = config.get<string>('pythonPath', 'python');
    const host = config.get<string>('serverHost', 'localhost');
    const port = config.get<number>('serverPort', 8000);
    const logLevel = config.get<string>('logLevel', 'info');

    if (!serverPath) {
        logger.info('Server path not configured, prompting user');
        const result = await vscode.window.showOpenDialog({
            canSelectFolders: true,
            title: 'Select MCP Ollama Python Installation Directory'
        });

        if (result && result[0]) {
            await config.update('serverPath', result[0].fsPath, vscode.ConfigurationTarget.Global);
            serverPath = result[0].fsPath;
            logger.info('Server path configured', { path: serverPath });
        } else {
            logger.warning('Server path selection cancelled');
            return;
        }
    }

    const mainScript = path.join(serverPath!, 'main.py');

    if (!fs.existsSync(mainScript)) {
        logger.error('Main script not found', { path: mainScript });
        vscode.window.showErrorMessage(`MCP Ollama main script not found at: ${mainScript}`);
        return;
    }

    logger.info('Server configuration', {
        python: pythonPath,
        script: mainScript,
        host: host,
        port: port,
        logLevel: logLevel
    });

    outputChannel.clear();
    outputChannel.show();
    outputChannel.appendLine(`Starting MCP Ollama server...`);
    outputChannel.appendLine(`Python: ${pythonPath}`);
    outputChannel.appendLine(`Script: ${mainScript}`);
    outputChannel.appendLine(`Host: ${host}, Port: ${port}`);

    try {
        serverProcess = spawn(pythonPath!, [mainScript, '--host', host, '--port', port.toString(), '--log-level', logLevel], {
            cwd: serverPath,
            stdio: ['pipe', 'pipe', 'pipe']
        });

        serverProcess.stdout?.on('data', (data) => {
            outputChannel.append(data.toString());
        });

        serverProcess.stderr?.on('data', (data) => {
            outputChannel.append(data.toString());
        });

        serverProcess.on('close', (code) => {
            logger.info('Server process exited', { code });
            outputChannel.appendLine(`Server process exited with code ${code}`);
            serverProcess = null;
            updateServerStatus();
        });

        serverProcess.on('error', (error) => {
            logger.error('Server process error', error);
            outputChannel.appendLine(`Server error: ${error.message}`);
            vscode.window.showErrorMessage(`Failed to start server: ${error.message}`);
            serverProcess = null;
            updateServerStatus();
        });

        updateServerStatus();
        logger.info('Server started successfully');
        vscode.window.showInformationMessage('MCP Ollama server started successfully');

    } catch (error: any) {
        logger.error('Failed to start server', error);
        vscode.window.showErrorMessage(`Failed to start server: ${error.message}`);
    }
}

async function stopServer() {
    if (!serverProcess) {
        logger.warning('Attempted to stop server while not running');
        vscode.window.showWarningMessage('MCP Ollama server is not running');
        return;
    }

    logger.info('Stopping MCP Ollama server...');
    outputChannel.appendLine('Stopping MCP Ollama server...');

    try {
        serverProcess.kill('SIGTERM');

        // Force kill if it doesn't stop gracefully
        setTimeout(() => {
            if (serverProcess && !serverProcess.killed) {
                serverProcess.kill('SIGKILL');
            }
        }, 5000);

        serverProcess = null;
        updateServerStatus();
        logger.info('Server stopped successfully');
        vscode.window.showInformationMessage('MCP Ollama server stopped');

    } catch (error: any) {
        logger.error('Failed to stop server', error);
        vscode.window.showErrorMessage(`Failed to stop server: ${error.message}`);
    }
}

async function restartServer() {
    logger.info('Restarting server...');
    await stopServer();
    setTimeout(() => startServer(), 2000);
}

async function showServerStatus() {
    logger.debug('Showing server status');
    const config = vscode.workspace.getConfiguration('mcp-ollama');
    const host = config.get<string>('serverHost', 'localhost');
    const port = config.get<number>('serverPort', 8000);
    const serverUrl = `http://${host}:${port}`;

    const isRunning = await checkServerHealth(serverUrl);
    logger.debug('Server health check result', { isRunning });

    const status = isRunning ? 'Running' : 'Stopped';
    const icon = isRunning ? '✅' : '❌';

    const message = `
${icon} MCP Ollama Server Status: ${status}

Server URL: ${serverUrl}
Process: ${serverProcess ? 'Active' : 'Not running'}
Configuration:
  - Server Path: ${config.get('serverPath') || 'Not configured'}
  - Python Path: ${config.get('pythonPath', 'python')}
  - Log Level: ${config.get('logLevel', 'info')}
  - Auto Start: ${config.get('autoStart', false)}
    `.trim();

    vscode.window.showInformationMessage(message, 'View Logs').then(choice => {
        if (choice === 'View Logs') {
            viewLogs();
        }
    });
}

async function configureServer() {
    logger.info('Opening server configuration');
    const config = vscode.workspace.getConfiguration('mcp-ollama');

    const actions: vscode.QuickPickItem[] = [
        { label: 'Configure Server Path', description: 'Set the path to MCP Ollama Python installation' },
        { label: 'Change Port', description: 'Change the server port' },
        { label: 'Toggle Auto Start', description: 'Enable/disable automatic server startup' },
        { label: 'Change Log Level', description: 'Set the server logging level' }
    ];

    const choice = await vscode.window.showQuickPick(actions, {
        placeHolder: 'Select configuration option'
    });

    switch (choice?.label) {
        case 'Configure Server Path':
            const result = await vscode.window.showOpenDialog({
                canSelectFolders: true,
                title: 'Select MCP Ollama Python Installation Directory'
            });
            if (result && result[0]) {
                await config.update('serverPath', result[0].fsPath, vscode.ConfigurationTarget.Global);
                logger.info('Server path updated', { path: result[0].fsPath });
                vscode.window.showInformationMessage('Server path updated');
            }
            break;

        case 'Change Port':
            const port = await vscode.window.showInputBox({
                prompt: 'Enter server port',
                value: config.get('serverPort', 8000).toString(),
                validateInput: (value) => {
                    const num = parseInt(value);
                    return isNaN(num) || num < 1 || num > 65535 ? 'Please enter a valid port number (1-65535)' : null;
                }
            });
            if (port) {
                await config.update('serverPort', parseInt(port), vscode.ConfigurationTarget.Global);
                logger.info('Server port updated', { port: parseInt(port) });
                vscode.window.showInformationMessage('Server port updated');
            }
            break;

        case 'Toggle Auto Start':
            const currentAutoStart = config.get('autoStart', false);
            await config.update('autoStart', !currentAutoStart, vscode.ConfigurationTarget.Global);
            logger.info('Auto start toggled', { enabled: !currentAutoStart });
            vscode.window.showInformationMessage(`Auto start ${!currentAutoStart ? 'enabled' : 'disabled'}`);
            break;

        case 'Change Log Level':
            const logLevels: vscode.QuickPickItem[] = [
                { label: 'debug', description: 'Show all debug information' },
                { label: 'info', description: 'Show general information' },
                { label: 'warning', description: 'Show warnings and errors' },
                { label: 'error', description: 'Show only errors' }
            ];

            const currentLogLevel = config.get('logLevel', 'info');
            const defaultLogLevel = logLevels.find(level => level.label === currentLogLevel);
            const logLevel = await vscode.window.showQuickPick(logLevels, {
                placeHolder: 'Select log level'
            });
            if (logLevel) {
                await config.update('logLevel', logLevel.label, vscode.ConfigurationTarget.Global);
                logger.info('Server log level updated', { level: logLevel.label });
                vscode.window.showInformationMessage('Log level updated');
            }
            break;
    }
}

function viewLogs() {
    logger.debug('Showing server output channel');
    outputChannel.show();
}

async function listModels() {
    logger.info('Fetching available models');
    const config = vscode.workspace.getConfiguration('mcp-ollama');
    const host = config.get<string>('serverHost', 'localhost');
    const port = config.get<number>('serverPort', 8000);
    const serverUrl = `http://${host}:${port}`;

    try {
        const response = await axios.get(`${serverUrl}/api/tags`, { timeout: 5000 });
        const models = response.data.models || [];
        logger.info('Models fetched', { count: models.length });

        if (models.length === 0) {
            logger.warning('No models available');
            vscode.window.showInformationMessage('No models available');
            return;
        }

        const modelItems: vscode.QuickPickItem[] = models.map((model: any) => ({
            label: model.name,
            description: `${model.size} | ${model.modified}`,
            detail: model.digest
        }));

        const selected = await vscode.window.showQuickPick(modelItems, {
            placeHolder: 'Select a model to view details'
        });

        if (selected) {
            const model = models.find((m: any) => m.name === selected.label);
            if (model) {
                const details = `
Model: ${model.name}
Size: ${model.size}
Modified: ${model.modified}
Digest: ${model.digest}
Family: ${model.details?.family || 'Unknown'}
Parameter Size: ${model.details?.parameter_size || 'Unknown'}
Quantization Level: ${model.details?.quantization_level || 'Unknown'}
                `.trim();

                vscode.window.showInformationMessage(details, 'Use Model').then(choice => {
                    if (choice === 'Use Model') {
                        // TODO: Implement model selection functionality
                        vscode.window.showInformationMessage(`Model ${model.name} selected for use`);
                    }
                });
            }
        }

    } catch (error: any) {
        logger.error('Failed to fetch models', error);
        vscode.window.showErrorMessage(`Failed to fetch models: ${error.message}`);
    }
}

async function updateServerStatus() {
    const config = vscode.workspace.getConfiguration('mcp-ollama');
    const host = config.get<string>('serverHost', 'localhost');
    const port = config.get<number>('serverPort', 8000);
    const serverUrl = `http://${host}:${port}`;

    const isRunning = await checkServerHealth(serverUrl);

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

async function checkServerHealth(serverUrl: string): Promise<boolean> {
    try {
        const response = await axios.get(`${serverUrl}/health`, { timeout: 2000 });
        const isHealthy = response.status === 200;
        logger.debug('Health check completed', { url: serverUrl, healthy: isHealthy });
        return isHealthy;
    } catch (error) {
        logger.debug('Health check failed', { url: serverUrl, error });
        return false;
    }
}
