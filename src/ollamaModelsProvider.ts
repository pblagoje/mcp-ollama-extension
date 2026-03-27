import * as vscode from 'vscode';
import { MCPOllamaClient } from './mcpClient';

export interface OllamaModelItem {
    name: string;
    size?: number;
    modified_at?: string;
    digest?: string;
}

export class OllamaModelTreeItem extends vscode.TreeItem {
    constructor(public readonly model: OllamaModelItem) {
        super(model.name, vscode.TreeItemCollapsibleState.None);
        const sizeGB = model.size ? `${(model.size / 1024 / 1024 / 1024).toFixed(2)} GB` : '';
        this.description = sizeGB;
        this.tooltip = [
            `Name: ${model.name}`,
            sizeGB ? `Size: ${sizeGB}` : '',
            model.modified_at ? `Modified: ${new Date(model.modified_at).toLocaleString()}` : '',
            model.digest ? `Digest: ${model.digest.substring(0, 12)}...` : ''
        ].filter(Boolean).join('\n');
        this.iconPath = new vscode.ThemeIcon('hubot');
        this.contextValue = 'ollamaModel';
        this.command = {
            command: 'mcp-ollama.chatWithModel',
            title: 'Chat with Model',
            arguments: [model.name]
        };
    }
}

export class OllamaModelsProvider implements vscode.TreeDataProvider<OllamaModelTreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<OllamaModelTreeItem | undefined | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private mcpClient: MCPOllamaClient | null = null;

    setClient(client: MCPOllamaClient | null): void {
        this.mcpClient = client;
        this._onDidChangeTreeData.fire();
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: OllamaModelTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(): Promise<OllamaModelTreeItem[]> {
        if (!this.mcpClient || !this.mcpClient.isConnected()) {
            return [];
        }
        try {
            const models: OllamaModelItem[] = await this.mcpClient.listModels();
            return models.map(m => new OllamaModelTreeItem(m));
        } catch {
            return [];
        }
    }
}
