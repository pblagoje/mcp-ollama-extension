import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');

    test('Extension should be present', () => {
        assert.ok(vscode.extensions.getExtension('mcp-ollama.mcp-ollama-extension'));
    });

    test('Should activate', async () => {
        const extension = vscode.extensions.getExtension('mcp-ollama.mcp-ollama-extension');
        if (extension) {
            await extension.activate();
            assert.ok(true);
        }
    });

    test('Should register commands', async () => {
        const commands = await vscode.commands.getCommands();
        const expectedCommands = [
            'mcp-ollama.startServer',
            'mcp-ollama.stopServer',
            'mcp-ollama.restartServer',
            'mcp-ollama.showServerStatus',
            'mcp-ollama.configureServer',
            'mcp-ollama.viewLogs',
            'mcp-ollama.listModels'
        ];

        expectedCommands.forEach(command => {
            assert.ok(commands.includes(command), `Command ${command} should be registered`);
        });
    });
});
