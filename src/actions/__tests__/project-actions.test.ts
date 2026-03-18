import { describe, test, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { createProject } from "../create-project";
import { getProject } from "../get-project";
import { getProjects } from "../get-projects";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const mockSession = { userId: "user-123", email: "user@example.com" };

const mockProject = {
  id: "proj-1",
  name: "My Component",
  userId: "user-123",
  messages: JSON.stringify([{ role: "user", content: "hi" }]),
  data: JSON.stringify({ "/App.jsx": { type: "file" } }),
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-02"),
};

describe("createProject", () => {
  beforeEach(() => vi.clearAllMocks());

  test("throws Unauthorized when no session", async () => {
    (getSession as any).mockResolvedValue(null);
    await expect(
      createProject({ name: "Test", messages: [], data: {} })
    ).rejects.toThrow("Unauthorized");
  });

  test("creates project with serialized messages and data", async () => {
    (getSession as any).mockResolvedValue(mockSession);
    (prisma.project.create as any).mockResolvedValue(mockProject);

    const messages = [{ role: "user", content: "hello" }];
    const data = { "/App.jsx": { type: "file" } };
    await createProject({ name: "My Component", messages, data });

    expect(prisma.project.create).toHaveBeenCalledWith({
      data: {
        name: "My Component",
        userId: "user-123",
        messages: JSON.stringify(messages),
        data: JSON.stringify(data),
      },
    });
  });

  test("returns the created project", async () => {
    (getSession as any).mockResolvedValue(mockSession);
    (prisma.project.create as any).mockResolvedValue(mockProject);
    const result = await createProject({ name: "Test", messages: [], data: {} });
    expect(result).toEqual(mockProject);
  });
});

describe("getProject", () => {
  beforeEach(() => vi.clearAllMocks());

  test("throws Unauthorized when no session", async () => {
    (getSession as any).mockResolvedValue(null);
    await expect(getProject("proj-1")).rejects.toThrow("Unauthorized");
  });

  test("throws when project not found", async () => {
    (getSession as any).mockResolvedValue(mockSession);
    (prisma.project.findUnique as any).mockResolvedValue(null);
    await expect(getProject("proj-1")).rejects.toThrow("Project not found");
  });

  test("queries by projectId and userId", async () => {
    (getSession as any).mockResolvedValue(mockSession);
    (prisma.project.findUnique as any).mockResolvedValue(mockProject);
    await getProject("proj-1");
    expect(prisma.project.findUnique).toHaveBeenCalledWith({
      where: { id: "proj-1", userId: "user-123" },
    });
  });

  test("deserializes messages and data from JSON", async () => {
    (getSession as any).mockResolvedValue(mockSession);
    (prisma.project.findUnique as any).mockResolvedValue(mockProject);
    const result = await getProject("proj-1");
    expect(result.messages).toEqual([{ role: "user", content: "hi" }]);
    expect(result.data).toEqual({ "/App.jsx": { type: "file" } });
  });

  test("returns all expected fields", async () => {
    (getSession as any).mockResolvedValue(mockSession);
    (prisma.project.findUnique as any).mockResolvedValue(mockProject);
    const result = await getProject("proj-1");
    expect(result.id).toBe("proj-1");
    expect(result.name).toBe("My Component");
    expect(result.createdAt).toBeDefined();
    expect(result.updatedAt).toBeDefined();
  });
});

describe("getProjects", () => {
  beforeEach(() => vi.clearAllMocks());

  test("throws Unauthorized when no session", async () => {
    (getSession as any).mockResolvedValue(null);
    await expect(getProjects()).rejects.toThrow("Unauthorized");
  });

  test("queries projects for current user ordered by updatedAt desc", async () => {
    (getSession as any).mockResolvedValue(mockSession);
    (prisma.project.findMany as any).mockResolvedValue([]);
    await getProjects();
    expect(prisma.project.findMany).toHaveBeenCalledWith({
      where: { userId: "user-123" },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, createdAt: true, updatedAt: true },
    });
  });

  test("returns list of projects", async () => {
    const projects = [
      { id: "p1", name: "A", createdAt: new Date(), updatedAt: new Date() },
      { id: "p2", name: "B", createdAt: new Date(), updatedAt: new Date() },
    ];
    (getSession as any).mockResolvedValue(mockSession);
    (prisma.project.findMany as any).mockResolvedValue(projects);
    const result = await getProjects();
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("p1");
  });

  test("returns empty array when user has no projects", async () => {
    (getSession as any).mockResolvedValue(mockSession);
    (prisma.project.findMany as any).mockResolvedValue([]);
    const result = await getProjects();
    expect(result).toEqual([]);
  });
});
