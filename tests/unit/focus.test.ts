import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  levelFromXp,
  evaluateAchievements,
  computeStreak,
  buildDailySeries,
  dateKey,
  dayDiff,
  formatClock,
  formatHours,
  XP_PER_LEVEL,
  type AchievementContext,
} from "@/lib/focus";
import type { FocusDailyStat } from "@/lib/types";

describe("levelFromXp", () => {
  it("starts every user at level 1 with no XP", () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(XP_PER_LEVEL - 1)).toBe(1);
  });

  it("levels up exactly on each XP threshold", () => {
    expect(levelFromXp(XP_PER_LEVEL)).toBe(2);
    expect(levelFromXp(XP_PER_LEVEL * 2)).toBe(3);
    expect(levelFromXp(XP_PER_LEVEL * 3 - 1)).toBe(3);
  });
});

describe("formatClock", () => {
  it("zero-pads minutes and seconds", () => {
    expect(formatClock(0)).toBe("00:00");
    expect(formatClock(65)).toBe("01:05");
    expect(formatClock(25 * 60)).toBe("25:00");
    expect(formatClock(3599)).toBe("59:59");
  });
});

describe("formatHours", () => {
  it("uses one decimal under 10 hours and rounds at/above 10", () => {
    expect(formatHours(30)).toBe("0.5h");
    expect(formatHours(90)).toBe("1.5h");
    expect(formatHours(600)).toBe("10h");
    expect(formatHours(635)).toBe("11h"); // 10.58h -> rounds to 11
  });
});

describe("dateKey / dayDiff", () => {
  it("formats a local date as YYYY-MM-DD without UTC drift", () => {
    // 27 June 2026 at local 00:30 — UTC-based formatting could roll to the 26th
    expect(dateKey(new Date(2026, 5, 27, 0, 30))).toBe("2026-06-27");
  });

  it("computes whole-day differences (a - b)", () => {
    expect(dayDiff("2026-06-27", "2026-06-20")).toBe(7);
    expect(dayDiff("2026-06-20", "2026-06-27")).toBe(-7);
    expect(dayDiff("2026-06-27", "2026-06-27")).toBe(0);
  });
});

describe("evaluateAchievements", () => {
  // neutral baseline: midday so the time-of-day badges don't fire
  const base: AchievementContext = {
    totalSessions: 0,
    totalFocusMinutes: 0,
    streakDays: 0,
    sessionsToday: 0,
    goalsMetToday: false,
    hour: 12,
  };

  it("returns nothing for a fresh user mid-day", () => {
    expect(evaluateAchievements(base)).toEqual([]);
  });

  it("unlocks the first-session badge after one session", () => {
    expect(evaluateAchievements({ ...base, totalSessions: 1 })).toContain("first_session");
  });

  it("unlocks every progress badge when all thresholds are met", () => {
    const earned = evaluateAchievements({
      totalSessions: 100,
      totalFocusMinutes: 3000,
      streakDays: 30,
      sessionsToday: 8,
      goalsMetToday: true,
      hour: 23,
    });
    for (const key of [
      "first_session", "sessions_10", "sessions_50", "sessions_100",
      "focus_60", "focus_600", "focus_3000",
      "streak_3", "streak_7", "streak_30",
      "daily_8", "goal_crusher", "night_owl",
    ]) {
      expect(earned).toContain(key);
    }
    // 23:00 is night, not early morning
    expect(earned).not.toContain("early_bird");
  });

  it("treats night owl (>=22h) and early bird (<7h) as mutually exclusive", () => {
    expect(evaluateAchievements({ ...base, hour: 22 })).toContain("night_owl");
    expect(evaluateAchievements({ ...base, hour: 6 })).toContain("early_bird");
    expect(evaluateAchievements({ ...base, hour: 6 })).not.toContain("night_owl");
  });
});

describe("computeStreak", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 27, 12, 0, 0)); // 27 June 2026, midday
  });
  afterEach(() => vi.useRealTimers());

  it("counts consecutive days ending today", () => {
    const active = new Set(["2026-06-27", "2026-06-26", "2026-06-25"]);
    expect(computeStreak(active)).toBe(3);
  });

  it("still counts a streak when today has no session yet but yesterday did", () => {
    const active = new Set(["2026-06-26", "2026-06-25"]);
    expect(computeStreak(active)).toBe(2);
  });

  it("breaks the streak on the first gap", () => {
    const active = new Set(["2026-06-27", "2026-06-25"]); // 26th missing
    expect(computeStreak(active)).toBe(1);
  });

  it("returns 0 when neither today nor yesterday is active", () => {
    expect(computeStreak(new Set(["2026-06-20"]))).toBe(0);
    expect(computeStreak(new Set())).toBe(0);
  });
});

describe("buildDailySeries", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 27, 12, 0, 0));
  });
  afterEach(() => vi.useRealTimers());

  it("returns a contiguous oldest->newest window, zero-filling missing days", () => {
    const stats = [
      { date: "2026-06-26", focus_minutes: 50, sessions_completed: 2, pomodoros: 2 },
    ] as FocusDailyStat[];

    const series = buildDailySeries(stats, 3);

    expect(series.map((s) => s.date)).toEqual(["2026-06-25", "2026-06-26", "2026-06-27"]);
    expect(series[0].focus_minutes).toBe(0); // missing day zero-filled
    expect(series[1].focus_minutes).toBe(50); // matched day carried through
    expect(series[2].sessions_completed).toBe(0);
  });
});
