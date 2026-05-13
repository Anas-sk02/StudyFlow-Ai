import { z } from "zod";

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
});

export const signupSchema = loginSchema.extend({
  fullName: z.string().min(2),
});

export const taskSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  subject: z.string().min(2),
  deadline: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]),
  estimated_hours: z.coerce.number().min(0.5).max(24),
});

export const roomSchema = z.object({
  name: z.string().min(3),
  topic: z.string().min(2),
});
