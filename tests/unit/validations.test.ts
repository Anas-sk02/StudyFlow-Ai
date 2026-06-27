import { describe, expect, it } from "vitest";
import {
  loginSchema,
  signupSchema,
  taskSchema,
  roomSchema,
} from "@/lib/validations";

describe("loginSchema", () => {
  it("accepts a valid email + password", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "secret123" }).success).toBe(true);
  });

  it("rejects a malformed email", () => {
    expect(loginSchema.safeParse({ email: "not-an-email", password: "secret123" }).success).toBe(false);
  });

  it("rejects a password shorter than 6 characters", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "123" }).success).toBe(false);
  });
});

describe("signupSchema", () => {
  it("requires a full name of at least 2 characters", () => {
    const ok = signupSchema.safeParse({ email: "a@b.com", password: "secret123", fullName: "Jo" });
    const bad = signupSchema.safeParse({ email: "a@b.com", password: "secret123", fullName: "J" });
    expect(ok.success).toBe(true);
    expect(bad.success).toBe(false);
  });
});

describe("taskSchema", () => {
  const valid = {
    title: "Revise calculus",
    subject: "Maths",
    priority: "high" as const,
    estimated_hours: 2,
  };

  it("accepts a minimal valid task", () => {
    expect(taskSchema.safeParse(valid).success).toBe(true);
  });

  it("coerces a numeric string for estimated_hours", () => {
    const result = taskSchema.safeParse({ ...valid, estimated_hours: "3" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.estimated_hours).toBe(3);
  });

  it("rejects an out-of-range estimate and an invalid priority", () => {
    expect(taskSchema.safeParse({ ...valid, estimated_hours: 0.1 }).success).toBe(false);
    expect(taskSchema.safeParse({ ...valid, priority: "urgent" }).success).toBe(false);
  });
});

describe("roomSchema", () => {
  it("enforces minimum lengths for name and topic", () => {
    expect(roomSchema.safeParse({ name: "Study Group", topic: "Physics" }).success).toBe(true);
    expect(roomSchema.safeParse({ name: "ab", topic: "Physics" }).success).toBe(false);
  });
});
