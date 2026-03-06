// Jest setup file
// Set test timeout
jest.setTimeout(30000);

// Mock langfuse module to avoid ESM issues
jest.mock('langfuse', () => ({
  Langfuse: jest.fn().mockImplementation(() => ({
    createTrace: jest.fn().mockReturnValue({
      update: jest.fn(),
    }),
    shutdown: jest.fn(),
  })),
}));

jest.mock('langfuse-langchain', () => ({
  LangfuseCallbackHandler: jest.fn().mockImplementation(() => ({
    handleLLMStart: jest.fn(),
    handleLLMEnd: jest.fn(),
    handleLLMError: jest.fn(),
  })),
}));

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  // Keep error for debugging
  error: console.error,
};
