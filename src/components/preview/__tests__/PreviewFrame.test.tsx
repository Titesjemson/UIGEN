import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { PreviewFrame } from "../PreviewFrame";

vi.mock("@/lib/contexts/file-system-context", () => ({
  useFileSystem: vi.fn(),
}));

vi.mock("@/lib/transform/jsx-transformer", () => ({
  createImportMap: vi.fn(),
  createPreviewHTML: vi.fn(),
}));

vi.mock("lucide-react", () => ({
  AlertCircle: () => <svg data-testid="alert-circle" />,
}));

import { useFileSystem } from "@/lib/contexts/file-system-context";
import { createImportMap, createPreviewHTML } from "@/lib/transform/jsx-transformer";

describe("PreviewFrame", () => {
  const mockGetAllFiles = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useFileSystem as any).mockReturnValue({
      getAllFiles: mockGetAllFiles,
      refreshTrigger: 0,
    });
  });

  afterEach(() => {
    cleanup();
  });

  test("renders first-load welcome screen when no files exist", () => {
    mockGetAllFiles.mockReturnValue(new Map());
    render(<PreviewFrame />);
    expect(screen.getByText("Welcome to UI Generator")).toBeDefined();
  });

  test("renders iframe when files with a known entry point exist", () => {
    const files = new Map([
      ["/App.jsx", "export default () => <div>Hello</div>"],
    ]);
    mockGetAllFiles.mockReturnValue(files);
    (createImportMap as any).mockReturnValue({ importMap: {}, styles: [], errors: [] });
    (createPreviewHTML as any).mockReturnValue("<html>preview</html>");

    render(<PreviewFrame />);
    const iframe = screen.getByTitle("Preview");
    expect(iframe).toBeDefined();
  });

  test("iframe has correct sandbox attributes", () => {
    const files = new Map([["/App.jsx", "content"]]);
    mockGetAllFiles.mockReturnValue(files);
    (createImportMap as any).mockReturnValue({ importMap: {}, styles: [], errors: [] });
    (createPreviewHTML as any).mockReturnValue("<html/>");

    render(<PreviewFrame />);
    const iframe = screen.getByTitle("Preview") as HTMLIFrameElement;
    expect(iframe.getAttribute("sandbox")).toContain("allow-scripts");
    expect(iframe.getAttribute("sandbox")).toContain("allow-same-origin");
  });

  test("detects App.tsx as entry point when App.jsx is absent", () => {
    const files = new Map([["/App.tsx", "content"]]);
    mockGetAllFiles.mockReturnValue(files);
    (createImportMap as any).mockReturnValue({ importMap: {}, styles: [], errors: [] });
    (createPreviewHTML as any).mockReturnValue("<html/>");

    render(<PreviewFrame />);
    expect(createPreviewHTML).toHaveBeenCalledWith(
      "/App.tsx",
      expect.anything(),
      expect.anything(),
      expect.anything()
    );
  });

  test("detects index.jsx as fallback entry point", () => {
    const files = new Map([["/index.jsx", "content"]]);
    mockGetAllFiles.mockReturnValue(files);
    (createImportMap as any).mockReturnValue({ importMap: {}, styles: [], errors: [] });
    (createPreviewHTML as any).mockReturnValue("<html/>");

    render(<PreviewFrame />);
    expect(createPreviewHTML).toHaveBeenCalledWith(
      "/index.jsx",
      expect.anything(),
      expect.anything(),
      expect.anything()
    );
  });

  test("shows error when files exist but no JSX/TSX entry point is found", () => {
    const files = new Map([["/styles.css", "body {}"]]);
    mockGetAllFiles.mockReturnValue(files);

    render(<PreviewFrame />);
    expect(screen.getByText("No Preview Available")).toBeDefined();
  });

  test("passes all files to createImportMap", () => {
    const files = new Map([["/App.jsx", "content"]]);
    mockGetAllFiles.mockReturnValue(files);
    (createImportMap as any).mockReturnValue({ importMap: {}, styles: [], errors: [] });
    (createPreviewHTML as any).mockReturnValue("<html/>");

    render(<PreviewFrame />);
    expect(createImportMap).toHaveBeenCalledWith(files);
  });
});
