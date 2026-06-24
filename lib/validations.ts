import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters").max(128),
});

export const signupSchema = loginSchema.extend({
  fullName: z.string().min(2, "Name must be at least 2 characters").max(100),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export const taskSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters").max(200),
  description: z.string().max(2000).optional(),
  subject: z.string().min(2, "Subject is required").max(100),
  deadline: z.string().optional(),
  due_time: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]),
  estimated_hours: z.coerce.number().min(0.5).max(24),
  recurrence: z.enum(["none", "daily", "weekly", "monthly"]).optional(),
  status: z.enum(["todo", "in_progress", "done"]).optional(),
});

export const profileSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  username: z.string().min(3).max(50).optional(),
  bio: z.string().max(500).optional(),
});

export const roomSchema = z.object({
  name: z.string().min(3, "Room name must be at least 3 characters").max(100),
  topic: z.string().min(2, "Topic is required").max(200),
});
