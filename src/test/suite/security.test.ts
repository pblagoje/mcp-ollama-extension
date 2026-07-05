import * as assert from 'assert';
import {
    buildMcpServerEnv,
    buildOllamaHostUrl,
    parseServerHostInput,
    validateModelName,
    validatePythonPath,
    validatePromptName,
    validateToolName,
} from '../../security';

suite('Security validation', () => {
    test('parseServerHostInput accepts localhost', () => {
        assert.strictEqual(parseServerHostInput('localhost'), 'localhost');
    });

    test('parseServerHostInput rejects credentials in URL', () => {
        assert.throws(
            () => parseServerHostInput('http://user:pass@127.0.0.1:11434'),
            /credentials/
        );
    });

    test('parseServerHostInput rejects metadata host', () => {
        assert.throws(
            () => parseServerHostInput('169.254.169.254'),
            /blocked/
        );
    });

    test('buildOllamaHostUrl formats IPv6 loopback', () => {
        assert.strictEqual(buildOllamaHostUrl('::1'), 'http://[::1]:11434');
    });

    test('validatePythonPath accepts standard commands', () => {
        assert.strictEqual(validatePythonPath('py'), 'py');
    });

    test('validatePythonPath rejects shell metacharacters', () => {
        assert.throws(() => validatePythonPath('python; rm -rf /'), /forbidden/);
    });

    test('validateModelName rejects path traversal', () => {
        assert.throws(() => validateModelName('../evil'), /Invalid model name/);
    });

    test('validateToolName allowlists MCP tools', () => {
        assert.strictEqual(validateToolName('ollama_chat'), 'ollama_chat');
        assert.throws(() => validateToolName('ollama_execute'), /Unsupported/);
    });

    test('validatePromptName allowlists MCP prompts', () => {
        assert.strictEqual(validatePromptName('explain_code'), 'explain_code');
        assert.throws(() => validatePromptName('evil_prompt'), /Unsupported/);
    });

    test('buildMcpServerEnv sets remote flag for LAN hosts', () => {
        const env = buildMcpServerEnv('192.168.1.50');
        assert.strictEqual(env.OLLAMA_ALLOW_REMOTE_HOST, '1');
        assert.strictEqual(env.OLLAMA_HOST, 'http://192.168.1.50:11434');
    });

    test('buildMcpServerEnv omits remote flag for localhost', () => {
        const env = buildMcpServerEnv('127.0.0.1');
        assert.strictEqual(env.OLLAMA_ALLOW_REMOTE_HOST, undefined);
    });
});
