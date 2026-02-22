import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

// Timeout constants (in milliseconds)
const TIMEOUT_CHAT = 300000; // 5 minutes
const TIMEOUT_GENERATE = 300000; // 5 minutes
const TIMEOUT_PULL = 600000; // 10 minutes
const TIMEOUT_DEFAULT = 30000; // 30 seconds

export interface MCPClientConfig {
    pythonPath: string;
    scriptPath: string;
    host: string;
    port: number;
}

export class MCPOllamaClient {
    private client: Client | null = null;
    private transport: StdioClientTransport | null = null;

    async connect(config: MCPClientConfig): Promise<void> {
        // Prepare OLLAMA_HOST environment variable
        // If config.host already includes protocol, use as-is, otherwise add http://
        let ollamaHost = config.host;
        if (!ollamaHost.startsWith('http://') && !ollamaHost.startsWith('https://')) {
            ollamaHost = `http://${ollamaHost}:11434`;
        }

        // Create transport that spawns the MCP server process
        this.transport = new StdioClientTransport({
            command: config.pythonPath,
            args: ['-m', 'mcp_ollama_python'],
            env: {
                ...process.env,
                OLLAMA_HOST: ollamaHost
            }
        });

        // Create MCP client
        this.client = new Client({
            name: 'mcp-ollama-extension',
            version: '1.0.3'
        }, {
            capabilities: {}
        });

        // Connect to the server
        await this.client.connect(this.transport);

        // Test basic communication by listing resources
        try {
            const resources = await this.client.listResources();
            console.log('[MCP Client] Available resources:', resources);
        } catch (error) {
            console.error('[MCP Client] Failed to list resources:', error);
            // Throw error to indicate connection issues
            throw new Error(`MCP server connected but failed initial communication test: ${error}`);
        }
    }

    async listAvailableResources(): Promise<any[]> {
        if (!this.client) {
            throw new Error('MCP client not connected');
        }

        try {
            const result = await this.client.listResources();
            return result.resources || [];
        } catch (error) {
            throw new Error(`Failed to list resources: ${error}`);
        }
    }

    async listModels(): Promise<any[]> {
        if (!this.client) {
            throw new Error('MCP client not connected');
        }

        try {
            console.log('[MCP Client] Requesting resource: ollama://models');

            // Read the models resource from the MCP server
            const result = await this.client.readResource({
                uri: 'ollama://models'
            });

            console.log('[MCP Client] Received result:', JSON.stringify(result, null, 2));

            // Parse the JSON response
            if (result.contents && result.contents.length > 0) {
                const content = result.contents[0] as { text?: string };
                console.log('[MCP Client] Content:', content);

                if (content.text) {
                    try {
                        const data = JSON.parse(content.text);
                        console.log('[MCP Client] Parsed data:', data);
                        // Validate structure
                        if (!data || typeof data !== 'object') {
                            throw new Error('Invalid data structure: expected object');
                        }
                        if (!Array.isArray(data.models)) {
                            throw new Error('Invalid data structure: models is not an array');
                        }
                        return data.models;
                    } catch (parseError) {
                        // Show the actual response to help debug
                        console.error('[MCP Client] JSON parse error:', parseError);
                        throw new Error(`Failed to parse MCP response as JSON. Response was: ${content.text.substring(0, 200)}`);
                    }
                }
            }

            console.warn('[MCP Client] No contents in result');
            return [];
        } catch (error) {
            console.error('[MCP Client] Error in listModels:', error);
            if (error instanceof Error) {
                throw error;
            }
            throw new Error(`Failed to list models: ${error}`);
        }
    }

    async listRunningModels(): Promise<any[]> {
        if (!this.client) {
            throw new Error('MCP client not connected');
        }

        try {
            const result = await this.client.readResource({
                uri: 'ollama://running'
            });

            if (result.contents && result.contents.length > 0) {
                const content = result.contents[0] as { text?: string };
                if (content.text) {
                    const data = JSON.parse(content.text);
                    return data.models || [];
                }
            }
            return [];
        } catch (error) {
            throw new Error(`Failed to list running models: ${error}`);
        }
    }

    async getConfig(): Promise<any> {
        if (!this.client) {
            throw new Error('MCP client not connected');
        }

        try {
            const result = await this.client.readResource({
                uri: 'ollama://config'
            });

            if (result.contents && result.contents.length > 0) {
                const content = result.contents[0] as { text?: string };
                if (content.text) {
                    return JSON.parse(content.text);
                }
            }
            return {};
        } catch (error) {
            throw new Error(`Failed to get config: ${error}`);
        }
    }

    async listTools(): Promise<any[]> {
        if (!this.client) {
            throw new Error('MCP client not connected');
        }

        try {
            const result = await this.client.listTools();
            return result.tools || [];
        } catch (error) {
            throw new Error(`Failed to list tools: ${error}`);
        }
    }

    async callTool(name: string, args: any, timeout?: number): Promise<any> {
        if (!this.client) {
            throw new Error('MCP client not connected');
        }

        try {
            // Use custom timeout if provided, otherwise use default
            const options = timeout ? { timeout } : undefined;
            const result = await this.client.callTool({
                name,
                arguments: args
            }, undefined, options);
            return result;
        } catch (error) {
            // Check if it's a timeout error
            const errorMsg = error instanceof Error ? error.message : String(error);
            if (errorMsg.includes('timeout') || errorMsg.includes('timed out')) {
                throw new Error(`Tool ${name} timed out after ${timeout || TIMEOUT_DEFAULT}ms`);
            }
            throw new Error(`Failed to call tool ${name}: ${error}`);
        }
    }

    /**
     * Helper method to parse JSON response from tool result
     */
    private parseToolResponse(result: any): any {
        if (!result) {
            return result;
        }

        // Try to extract and parse JSON from content
        if (result.content?.[0]?.text) {
            try {
                return JSON.parse(result.content[0].text);
            } catch {
                // If parsing fails, return the text as-is
                return result.content[0].text;
            }
        }

        return result;
    }

    // Ollama-specific tool methods
    async chat(model: string, messages: any[], options?: any): Promise<any> {
        const args: any = { model, messages };
        if (options) {
            args.options = options;
        }
        const result = await this.callTool('ollama_chat', args, TIMEOUT_CHAT);
        return this.parseToolResponse(result);
    }

    async generate(model: string, prompt: string, options?: any): Promise<any> {
        const args: any = { model, prompt };
        if (options) {
            args.options = options;
        }
        const result = await this.callTool('ollama_generate', args, TIMEOUT_GENERATE);
        return this.parseToolResponse(result);
    }

    async embed(model: string, input: string | string[]): Promise<any> {
        const result = await this.callTool('ollama_embed', { model, input }, TIMEOUT_DEFAULT);
        return this.parseToolResponse(result);
    }

    async showModel(model: string): Promise<any> {
        const result = await this.callTool('ollama_show', { model }, TIMEOUT_DEFAULT);
        return this.parseToolResponse(result);
    }

    async pullModel(model: string): Promise<any> {
        const result = await this.callTool('ollama_pull', { model }, TIMEOUT_PULL);
        return this.parseToolResponse(result);
    }

    async deleteModel(model: string): Promise<any> {
        const result = await this.callTool('ollama_delete', { model }, TIMEOUT_DEFAULT);
        return this.parseToolResponse(result);
    }

    async listRunningModelsViaTool(): Promise<any> {
        const result = await this.callTool('ollama_ps', {}, TIMEOUT_DEFAULT);
        return this.parseToolResponse(result);
    }

    async listModelsViaTool(): Promise<any> {
        const result = await this.callTool('ollama_list', {}, TIMEOUT_DEFAULT);
        return this.parseToolResponse(result);
    }

    // MCP Prompt methods
    async listPrompts(): Promise<any[]> {
        if (!this.client) {
            throw new Error('MCP client not connected');
        }

        try {
            const result = await this.client.listPrompts();
            return result.prompts || [];
        } catch (error) {
            throw new Error(`Failed to list prompts: ${error}`);
        }
    }

    async getPrompt(name: string, args?: Record<string, string>): Promise<any> {
        if (!this.client) {
            throw new Error('MCP client not connected');
        }

        try {
            const result = await this.client.getPrompt({ name, arguments: args });
            return result;
        } catch (error) {
            throw new Error(`Failed to get prompt: ${error}`);
        }
    }

    isConnected(): boolean {
        return this.client !== null && this.transport !== null;
    }

    async disconnect(): Promise<void> {
        const errors: Error[] = [];

        if (this.client) {
            try {
                await this.client.close();
            } catch (error) {
                errors.push(error instanceof Error ? error : new Error(String(error)));
            } finally {
                this.client = null;
            }
        }

        if (this.transport) {
            try {
                await this.transport.close();
            } catch (error) {
                errors.push(error instanceof Error ? error : new Error(String(error)));
            } finally {
                this.transport = null;
            }
        }

        if (errors.length > 0) {
            throw new Error(`Disconnect errors: ${errors.map(e => e.message).join(', ')}`);
        }
    }
}
