/**
 * Phase 4 client. Fetches aggregated dashboard data for the signed-in user
 * from the user-stats Edge Function. One round-trip returns every dataset
 * the dashboard needs (top-line numbers, top mistake types, accuracy trend,
 * recent activity, streak).
 */
import { supabase } from "./supabase";

export type Timeframe = "7d" | "30d" | "90d" | "all";

export interface TopMistakeType {
  type: string;
  count: number;
  last_seen_at: string;
}

export interface AccuracyPoint {
  date: string;          // "YYYY-MM-DD"
  avg: number;           // 0-100, rounded
  submissions: number;
}

export interface RecentActivity {
  id: string;
  snippet: string;
  accuracy_score: number;
  mistake_count: number;
  focus_area: string | null;
  created_at: string;
}

export interface UserStats {
  timeframe: Timeframe;
  total_submissions: number;
  total_mistakes: number;
  accuracy: number;            // 0-100
  streak_days: number;
  top_mistake_types: TopMistakeType[];
  accuracy_trend: AccuracyPoint[];
  recent_activity: RecentActivity[];
}

/**
 * @param {Timeframe} [timeframe="30d"] - one of "7d" | "30d" | "90d" | "all".
 * @returns {Promise<UserStats>}
 */
export async function getUserStats(timeframe = "30d") {
  const { data, error } = await supabase.functions.invoke("user-stats", {
    body: { timeframe },
  });
  if (error) {
    throw new Error(error.message ?? "user-stats failed");
  }
  return data;
}
