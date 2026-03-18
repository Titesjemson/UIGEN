import { describe, test, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({
  createSession: vi.fn(),
  deleteSession: vi.fn(),
  getSession: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));
vi.mock("bcrypt", () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { signUp, signIn, signOut, getUser } from "../index";
import { createSession, deleteSession, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

describe("signUp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("returns error when email is missing", async () => {
    const result = await signUp("", "password123");
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test("returns error when password is missing", async () => {
    const result = await signUp("user@example.com", "");
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test("returns error when password is less than 8 characters", async () => {
    const result = await signUp("user@example.com", "short");
    expect(result.success).toBe(false);
    expect(result.error).toContain("8 characters");
  });

  test("returns error when email is already registered", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ id: "1", email: "user@example.com" });
    const result = await signUp("user@example.com", "password123");
    expect(result.success).toBe(false);
    expect(result.error).toContain("already registered");
  });

  test("creates user and session on success", async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);
    (bcrypt.hash as any).mockResolvedValue("hashed-password");
    (prisma.user.create as any).mockResolvedValue({ id: "new-id", email: "user@example.com" });

    const result = await signUp("user@example.com", "password123");

    expect(bcrypt.hash).toHaveBeenCalledWith("password123", 10);
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: { email: "user@example.com", password: "hashed-password" },
    });
    expect(createSession).toHaveBeenCalledWith("new-id", "user@example.com");
    expect(result.success).toBe(true);
  });

  test("returns error on unexpected Prisma failure", async () => {
    (prisma.user.findUnique as any).mockRejectedValue(new Error("DB error"));
    const result = await signUp("user@example.com", "password123");
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe("signIn", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("returns error when email is missing", async () => {
    const result = await signIn("", "password123");
    expect(result.success).toBe(false);
  });

  test("returns error when password is missing", async () => {
    const result = await signIn("user@example.com", "");
    expect(result.success).toBe(false);
  });

  test("returns error when user does not exist", async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);
    const result = await signIn("unknown@example.com", "password123");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid credentials");
  });

  test("returns error when password is wrong", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({
      id: "1",
      email: "user@example.com",
      password: "hashed",
    });
    (bcrypt.compare as any).mockResolvedValue(false);
    const result = await signIn("user@example.com", "wrongpass");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid credentials");
  });

  test("creates session and returns success on valid credentials", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({
      id: "user-id",
      email: "user@example.com",
      password: "hashed",
    });
    (bcrypt.compare as any).mockResolvedValue(true);
    const result = await signIn("user@example.com", "password123");
    expect(createSession).toHaveBeenCalledWith("user-id", "user@example.com");
    expect(result.success).toBe(true);
  });

  test("returns error on unexpected failure", async () => {
    (prisma.user.findUnique as any).mockRejectedValue(new Error("DB error"));
    const result = await signIn("user@example.com", "password123");
    expect(result.success).toBe(false);
  });
});

describe("signOut", () => {
  test("deletes session and redirects to /", async () => {
    await signOut();
    expect(deleteSession).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/");
    expect(redirect).toHaveBeenCalledWith("/");
  });
});

describe("getUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("returns null when no session", async () => {
    (getSession as any).mockResolvedValue(null);
    const result = await getUser();
    expect(result).toBeNull();
  });

  test("returns user data when session is valid", async () => {
    (getSession as any).mockResolvedValue({ userId: "user-id", email: "user@example.com" });
    (prisma.user.findUnique as any).mockResolvedValue({
      id: "user-id",
      email: "user@example.com",
      createdAt: new Date(),
    });
    const result = await getUser();
    expect(result).not.toBeNull();
    expect(result!.id).toBe("user-id");
  });

  test("returns null on Prisma failure", async () => {
    (getSession as any).mockResolvedValue({ userId: "user-id" });
    (prisma.user.findUnique as any).mockRejectedValue(new Error("DB error"));
    const result = await getUser();
    expect(result).toBeNull();
  });
});
