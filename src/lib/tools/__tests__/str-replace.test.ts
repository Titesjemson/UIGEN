import { describe, test, expect, vi, beforeEach } from "vitest";
import { buildStrReplaceTool } from "../str-replace";
import { VirtualFileSystem } from "@/lib/file-system";

vi.mock("@/lib/file-system");

describe("buildStrReplaceTool", () => {
  let fileSystem: VirtualFileSystem;
  let tool: ReturnType<typeof buildStrReplaceTool>;

  beforeEach(() => {
    fileSystem = new VirtualFileSystem();
    fileSystem.viewFile = vi.fn().mockReturnValue("file content");
    fileSystem.createFileWithParents = vi.fn().mockReturnValue("created");
    fileSystem.replaceInFile = vi.fn().mockReturnValue("replaced");
    fileSystem.insertInFile = vi.fn().mockReturnValue("inserted");
    tool = buildStrReplaceTool(fileSystem);
  });

  test("has the correct tool id", () => {
    expect(tool.id).toBe("str_replace_editor");
  });

  test("view delegates to fileSystem.viewFile", async () => {
    await tool.execute!({ command: "view", path: "/App.tsx" } as any);
    expect(fileSystem.viewFile).toHaveBeenCalledWith("/App.tsx", undefined);
  });

  test("view passes view_range to fileSystem.viewFile", async () => {
    await tool.execute!({
      command: "view",
      path: "/App.tsx",
      view_range: [1, 10],
    } as any);
    expect(fileSystem.viewFile).toHaveBeenCalledWith("/App.tsx", [1, 10]);
  });

  test("create delegates to fileSystem.createFileWithParents", async () => {
    await tool.execute!({
      command: "create",
      path: "/new.tsx",
      file_text: "export default () => <div/>",
    } as any);
    expect(fileSystem.createFileWithParents).toHaveBeenCalledWith(
      "/new.tsx",
      "export default () => <div/>"
    );
  });

  test("create uses empty string when file_text is omitted", async () => {
    await tool.execute!({ command: "create", path: "/empty.tsx" } as any);
    expect(fileSystem.createFileWithParents).toHaveBeenCalledWith(
      "/empty.tsx",
      ""
    );
  });

  test("str_replace delegates to fileSystem.replaceInFile", async () => {
    await tool.execute!({
      command: "str_replace",
      path: "/App.tsx",
      old_str: "old",
      new_str: "new",
    } as any);
    expect(fileSystem.replaceInFile).toHaveBeenCalledWith(
      "/App.tsx",
      "old",
      "new"
    );
  });

  test("str_replace uses empty strings when old_str/new_str omitted", async () => {
    await tool.execute!({ command: "str_replace", path: "/App.tsx" } as any);
    expect(fileSystem.replaceInFile).toHaveBeenCalledWith("/App.tsx", "", "");
  });

  test("insert delegates to fileSystem.insertInFile", async () => {
    await tool.execute!({
      command: "insert",
      path: "/App.tsx",
      insert_line: 5,
      new_str: "inserted line",
    } as any);
    expect(fileSystem.insertInFile).toHaveBeenCalledWith(
      "/App.tsx",
      5,
      "inserted line"
    );
  });

  test("insert defaults insert_line to 0 when omitted", async () => {
    await tool.execute!({
      command: "insert",
      path: "/App.tsx",
      new_str: "line",
    } as any);
    expect(fileSystem.insertInFile).toHaveBeenCalledWith("/App.tsx", 0, "line");
  });

  test("undo_edit returns an error string", async () => {
    const result = await tool.execute!({
      command: "undo_edit",
      path: "/App.tsx",
    } as any);
    expect(typeof result).toBe("string");
    expect(result).toContain("undo_edit");
    expect(result).toContain("not supported");
  });
});
