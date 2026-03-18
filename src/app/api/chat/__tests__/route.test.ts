import { describe, test, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/file-system", () => ({
  VirtualFileSystem: vi.fn().mockImplementation(() => ({
    deserializeFromNodes: vi.fn(),
    serialize: vi.fn().mockReturnValue({}),
  })),
}));

vi.mock("ai", () => ({
  streamText: vi.fn().mockReturnValue({
    toDataStreamResponse: vi.fn().mockReturnValue(new Response("stream")),
  }),
  appendResponseMessages: vi.fn().mockReturnValue([]),
}));

vi.mock("@/lib/tools/str-replace", () => ({
  buildStrReplaceTool: vi.fn().mockReturnValue({ id: "str_replace_editor" }),
}));

vi.mock("@/lib/tools/file-manager", () => ({
  buildFileManagerTool: vi.fn().mockReturnValue({}),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: { update: vi.fn() },
  },
}));

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/provider", () => ({
  getLanguageModel: vi.fn().mockReturnValue("mock-model"),
}));

vi.mock("@/lib/prompts/generation", () => ({
  generationPrompt: "You are a UI generator.",
}));

import { POST } from "../route";
import { streamText } from "ai";
import { VirtualFileSystem } from "@/lib/file-system";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function makeRequest(body: object) {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("returns a data stream response", async () => {
    const req = makeRequest({ messages: [], files: {}, projectId: undefined });
    const response = await POST(req);
    expect(response).toBeInstanceOf(Response);
  });

  test("prepends system message to messages array", async () => {
    const userMessage = { role: "user", content: "make a button" };
    const req = makeRequest({ messages: [userMessage], files: {} });
    await POST(req);

    const callArgs = (streamText as any).mock.calls[0][0];
    expect(callArgs.messages[0].role).toBe("system");
    expect(callArgs.messages[0].content).toBe("You are a UI generator.");
    expect(callArgs.messages[1]).toEqual(userMessage);
  });

  test("deserializes file system from request files", async () => {
    const files = { "/App.jsx": { type: "file", content: "hello" } };
    const req = makeRequest({ messages: [], files });
    await POST(req);

    const instance = (VirtualFileSystem as any).mock.results[0].value;
    expect(instance.deserializeFromNodes).toHaveBeenCalledWith(files);
  });

  test("calls streamText with the language model", async () => {
    const req = makeRequest({ messages: [], files: {} });
    await POST(req);
    expect(streamText).toHaveBeenCalledWith(
      expect.objectContaining({ model: "mock-model" })
    );
  });

  test("calls streamText with both tools", async () => {
    const req = makeRequest({ messages: [], files: {} });
    await POST(req);
    const callArgs = (streamText as any).mock.calls[0][0];
    expect(callArgs.tools).toHaveProperty("str_replace_editor");
    expect(callArgs.tools).toHaveProperty("file_manager");
  });

  test("saves project on finish when projectId and session exist", async () => {
    (getSession as any).mockResolvedValue({ userId: "user-1" });

    const req = makeRequest({
      messages: [{ role: "user", content: "hi" }],
      files: {},
      projectId: "proj-1",
    });
    await POST(req);

    const { onFinish } = (streamText as any).mock.calls[0][0];
    await onFinish({ response: { messages: [] } });

    expect(prisma.project.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "proj-1", userId: "user-1" },
      })
    );
  });

  test("does not save project when no session", async () => {
    (getSession as any).mockResolvedValue(null);

    const req = makeRequest({
      messages: [],
      files: {},
      projectId: "proj-1",
    });
    await POST(req);

    const { onFinish } = (streamText as any).mock.calls[0][0];
    await onFinish({ response: { messages: [] } });

    expect(prisma.project.update).not.toHaveBeenCalled();
  });

  test("does not attempt to save when no projectId", async () => {
    const req = makeRequest({ messages: [], files: {} });
    await POST(req);

    const { onFinish } = (streamText as any).mock.calls[0][0];
    await onFinish({ response: { messages: [] } });

    expect(prisma.project.update).not.toHaveBeenCalled();
  });

  test("filters out system messages before saving", async () => {
    (getSession as any).mockResolvedValue({ userId: "user-1" });

    const req = makeRequest({
      messages: [{ role: "user", content: "hi" }],
      files: {},
      projectId: "proj-1",
    });
    await POST(req);

    const { onFinish } = (streamText as any).mock.calls[0][0];
    await onFinish({ response: { messages: [] } });

    const updateCall = (prisma.project.update as any).mock.calls[0][0];
    const savedMessages = JSON.parse(updateCall.data.messages);
    const hasSystemMessage = savedMessages.some((m: any) => m.role === "system");
    expect(hasSystemMessage).toBe(false);
  });
});
