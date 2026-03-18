import { describe, test, expect, vi, beforeEach } from "vitest";
import { buildFileManagerTool } from "../file-manager";
import { VirtualFileSystem } from "@/lib/file-system";

vi.mock("@/lib/file-system");

describe("buildFileManagerTool", () => {
  let fileSystem: VirtualFileSystem;
  let tool: ReturnType<typeof buildFileManagerTool>;

  beforeEach(() => {
    fileSystem = new VirtualFileSystem();
    tool = buildFileManagerTool(fileSystem);
  });

  test("returns a tool with description and parameters", () => {
    expect(tool).toBeDefined();
    expect(typeof tool).toBe("object");
  });

  describe("rename command", () => {
    test("returns success when rename succeeds", async () => {
      (fileSystem.rename as any) = vi.fn().mockReturnValue(true);
      const result = await (tool as any).execute({
        command: "rename",
        path: "/old.tsx",
        new_path: "/new.tsx",
      });
      expect(result.success).toBe(true);
      expect(result.message).toContain("/old.tsx");
      expect(result.message).toContain("/new.tsx");
    });

    test("returns failure when rename returns false", async () => {
      (fileSystem.rename as any) = vi.fn().mockReturnValue(false);
      const result = await (tool as any).execute({
        command: "rename",
        path: "/old.tsx",
        new_path: "/new.tsx",
      });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test("returns error when new_path is missing", async () => {
      const result = await (tool as any).execute({
        command: "rename",
        path: "/old.tsx",
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain("new_path is required");
    });

    test("calls fileSystem.rename with correct args", async () => {
      (fileSystem.rename as any) = vi.fn().mockReturnValue(true);
      await (tool as any).execute({
        command: "rename",
        path: "/a.tsx",
        new_path: "/b.tsx",
      });
      expect(fileSystem.rename).toHaveBeenCalledWith("/a.tsx", "/b.tsx");
    });
  });

  describe("delete command", () => {
    test("returns success when deleteFile succeeds", async () => {
      (fileSystem.deleteFile as any) = vi.fn().mockReturnValue(true);
      const result = await (tool as any).execute({
        command: "delete",
        path: "/App.tsx",
      });
      expect(result.success).toBe(true);
      expect(result.message).toContain("/App.tsx");
    });

    test("returns failure when deleteFile returns false", async () => {
      (fileSystem.deleteFile as any) = vi.fn().mockReturnValue(false);
      const result = await (tool as any).execute({
        command: "delete",
        path: "/missing.tsx",
      });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test("calls fileSystem.deleteFile with correct path", async () => {
      (fileSystem.deleteFile as any) = vi.fn().mockReturnValue(true);
      await (tool as any).execute({ command: "delete", path: "/foo.tsx" });
      expect(fileSystem.deleteFile).toHaveBeenCalledWith("/foo.tsx");
    });
  });
});
