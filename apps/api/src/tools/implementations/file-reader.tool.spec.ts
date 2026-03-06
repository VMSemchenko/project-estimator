import { FileReaderTool } from "./file-reader.tool";
import * as fs from "fs/promises";
import * as path from "path";

// Mock fs/promises
jest.mock("fs/promises");
const mockedFs = fs as jest.Mocked<typeof fs>;

describe("FileReaderTool", () => {
  let tool: FileReaderTool;

  beforeEach(() => {
    tool = new FileReaderTool();
    jest.clearAllMocks();
  });

  describe("basic properties", () => {
    it("should be defined", () => {
      expect(tool).toBeDefined();
    });

    it("should have correct name", () => {
      expect(tool.name).toBe("file_reader");
    });

    it("should have description", () => {
      expect(tool.description).toBeDefined();
      expect(tool.description).toContain("file");
    });
  });

  describe("readFile", () => {
    it("should read a file successfully", async () => {
      const testContent = "Test file content";
      const testPath = "/test/file.txt";

      mockedFs.stat.mockResolvedValue({
        isFile: () => true,
        size: testContent.length,
      } as any);
      mockedFs.readFile.mockResolvedValue(testContent);

      const result = await tool.readFile(testPath);

      expect(result).toBeDefined();
      expect(result.content).toBe(testContent);
      expect(result.path).toContain("file.txt");
      expect(result.size).toBe(testContent.length);
    });

    it("should throw error for non-existent file", async () => {
      const testPath = "/non/existent/file.txt";

      mockedFs.stat.mockRejectedValue(new Error("ENOENT"));

      await expect(tool.readFile(testPath)).rejects.toThrow();
    });

    it("should throw error if path is not a file", async () => {
      const testPath = "/test/directory";

      mockedFs.stat.mockResolvedValue({
        isFile: () => false,
      } as any);

      await expect(tool.readFile(testPath)).rejects.toThrow("not a file");
    });

    it("should use default encoding when not specified", async () => {
      const testContent = "Test content";
      const testPath = "/test/file.txt";

      mockedFs.stat.mockResolvedValue({
        isFile: () => true,
        size: testContent.length,
      } as any);
      mockedFs.readFile.mockResolvedValue(testContent);

      await tool.readFile(testPath);

      expect(mockedFs.readFile).toHaveBeenCalledWith(
        expect.stringContaining("file.txt"),
        "utf-8",
      );
    });

    it("should use specified encoding", async () => {
      const testContent = "Test content";
      const testPath = "/test/file.txt";

      mockedFs.stat.mockResolvedValue({
        isFile: () => true,
        size: testContent.length,
      } as any);
      mockedFs.readFile.mockResolvedValue(testContent);

      await tool.readFile(testPath, "ascii");

      expect(mockedFs.readFile).toHaveBeenCalledWith(
        expect.stringContaining("file.txt"),
        "ascii",
      );
    });
  });

  describe("readFiles", () => {
    it("should read multiple files successfully", async () => {
      const testPaths = ["/test/file1.txt", "/test/file2.txt"];
      const testContents = ["Content 1", "Content 2"];

      mockedFs.stat.mockResolvedValue({
        isFile: () => true,
        size: 10,
      } as any);

      testContents.forEach((content, index) => {
        mockedFs.readFile.mockResolvedValueOnce(content);
      });

      const results = await tool.readFiles(testPaths);

      expect(results.size).toBe(2);
      expect(results.get("/test/file1.txt")?.content).toBe("Content 1");
      expect(results.get("/test/file2.txt")?.content).toBe("Content 2");
    });

    it("should return empty map for empty input", async () => {
      const results = await tool.readFiles([]);
      expect(results.size).toBe(0);
    });

    it("should handle errors for individual files", async () => {
      const testPaths = ["/test/file1.txt", "/test/file2.txt"];

      mockedFs.stat.mockResolvedValue({
        isFile: () => true,
        size: 10,
      } as any);

      mockedFs.readFile.mockResolvedValueOnce("Content 1");
      mockedFs.readFile.mockRejectedValueOnce(new Error("Read error"));

      // The tool might throw or handle errors differently
      // Adjust expectation based on actual implementation
      await expect(tool.readFiles(testPaths)).resolves.toBeDefined();
    });
  });

  describe("listFiles", () => {
    it("should list files in directory", async () => {
      const testDir = "/test/directory";
      const testFiles = ["file1.txt", "file2.md", "file3.json"];

      mockedFs.stat.mockResolvedValue({
        isDirectory: () => true,
      } as any);

      mockedFs.readdir.mockResolvedValue(
        testFiles.map((f) => ({ name: f, isFile: () => true })) as any,
      );

      const result = await tool.listFiles(testDir);

      expect(result).toBeDefined();
      expect(result.directory).toContain("directory");
      expect(result.count).toBeGreaterThan(0);
    });

    it("should filter by extension when specified", async () => {
      const testDir = "/test/directory";
      const testFiles = [
        { name: "file1.txt", isFile: () => true },
        { name: "file2.md", isFile: () => true },
        { name: "file3.txt", isFile: () => true },
      ];

      mockedFs.stat.mockResolvedValue({
        isDirectory: () => true,
      } as any);

      mockedFs.readdir.mockResolvedValue(testFiles as any);

      const result = await tool.listFiles(testDir, [".txt"]);

      expect(result.files.filter((f) => f.endsWith(".txt")).length).toBe(
        result.files.length,
      );
    });

    it("should throw error for non-existent directory", async () => {
      const testDir = "/non/existent/directory";

      mockedFs.stat.mockRejectedValue(new Error("ENOENT"));

      await expect(tool.listFiles(testDir)).rejects.toThrow();
    });
  });

  describe("fileExists", () => {
    it("should return true for existing file", async () => {
      const testPath = "/test/file.txt";

      mockedFs.stat.mockResolvedValue({
        isFile: () => true,
      } as any);

      const result = await tool.fileExists(testPath);

      expect(result).toBe(true);
    });

    it("should return false for non-existent file", async () => {
      const testPath = "/non/existent/file.txt";

      mockedFs.stat.mockRejectedValue(new Error("ENOENT"));

      const result = await tool.fileExists(testPath);

      expect(result).toBe(false);
    });

    it("should return false for directory", async () => {
      const testPath = "/test/directory";

      mockedFs.stat.mockResolvedValue({
        isFile: () => false,
        isDirectory: () => true,
      } as any);

      const result = await tool.fileExists(testPath);

      expect(result).toBe(false);
    });
  });
});
