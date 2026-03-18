import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { CodeEditor } from "../CodeEditor";

vi.mock("@/lib/contexts/file-system-context", () => ({
  useFileSystem: vi.fn(),
}));

vi.mock("lucide-react", () => ({
  Code2: () => <svg data-testid="code2-icon" />,
}));

vi.mock("@monaco-editor/react", () => ({
  default: ({
    language,
    value,
    onChange,
    onMount,
  }: {
    language: string;
    value: string;
    onChange: (v: string) => void;
    onMount: (editor: any) => void;
  }) => (
    <div
      data-testid="monaco-editor"
      data-language={language}
      data-value={value}
      onClick={() => onChange("new content")}
      onFocus={() => onMount({ getValue: vi.fn() })}
    />
  ),
}));

import { useFileSystem } from "@/lib/contexts/file-system-context";

describe("CodeEditor", () => {
  const mockUpdateFile = vi.fn();
  const mockGetFileContent = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  test("renders empty state when no file is selected", () => {
    (useFileSystem as any).mockReturnValue({
      selectedFile: null,
      getFileContent: mockGetFileContent,
      updateFile: mockUpdateFile,
    });

    render(<CodeEditor />);
    expect(screen.getByText("Select a file to edit")).toBeDefined();
  });

  test("renders Monaco editor when a file is selected", () => {
    mockGetFileContent.mockReturnValue("const x = 1;");
    (useFileSystem as any).mockReturnValue({
      selectedFile: "/App.tsx",
      getFileContent: mockGetFileContent,
      updateFile: mockUpdateFile,
    });

    render(<CodeEditor />);
    expect(screen.getByTestId("monaco-editor")).toBeDefined();
  });

  describe("language detection from file extension", () => {
    const cases = [
      ["/file.js", "javascript"],
      ["/file.jsx", "javascript"],
      ["/file.ts", "typescript"],
      ["/file.tsx", "typescript"],
      ["/file.json", "json"],
      ["/file.css", "css"],
      ["/file.html", "html"],
      ["/file.md", "markdown"],
      ["/file.unknown", "plaintext"],
    ];

    test.each(cases)("%s → %s", (path, expectedLanguage) => {
      mockGetFileContent.mockReturnValue("");
      (useFileSystem as any).mockReturnValue({
        selectedFile: path,
        getFileContent: mockGetFileContent,
        updateFile: mockUpdateFile,
      });

      render(<CodeEditor />);
      const editor = screen.getByTestId("monaco-editor");
      expect(editor.getAttribute("data-language")).toBe(expectedLanguage);
      cleanup();
    });
  });

  test("passes file content as value to Monaco editor", () => {
    mockGetFileContent.mockReturnValue("export default App;");
    (useFileSystem as any).mockReturnValue({
      selectedFile: "/App.tsx",
      getFileContent: mockGetFileContent,
      updateFile: mockUpdateFile,
    });

    render(<CodeEditor />);
    const editor = screen.getByTestId("monaco-editor");
    expect(editor.getAttribute("data-value")).toBe("export default App;");
  });

  test("calls updateFile when editor content changes", () => {
    mockGetFileContent.mockReturnValue("old content");
    (useFileSystem as any).mockReturnValue({
      selectedFile: "/App.tsx",
      getFileContent: mockGetFileContent,
      updateFile: mockUpdateFile,
    });

    render(<CodeEditor />);
    screen.getByTestId("monaco-editor").click();
    expect(mockUpdateFile).toHaveBeenCalledWith("/App.tsx", "new content");
  });

  test("falls back to empty string when getFileContent returns null", () => {
    mockGetFileContent.mockReturnValue(null);
    (useFileSystem as any).mockReturnValue({
      selectedFile: "/App.tsx",
      getFileContent: mockGetFileContent,
      updateFile: mockUpdateFile,
    });

    render(<CodeEditor />);
    const editor = screen.getByTestId("monaco-editor");
    expect(editor.getAttribute("data-value")).toBe("");
  });
});
