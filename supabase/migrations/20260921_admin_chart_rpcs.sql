-- ═══════════════════════════════════════════════════════════════
-- Admin Dashboard Chart RPCs
-- Run this in the Supabase SQL Editor to enable the 3 charts
-- ═══════════════════════════════════════════════════════════════

-- 1. Daily Growth (last N days) — feeds User Growth chart + sparklines
CREATE OR REPLACE FUNCTION get_daily_growth(days integer DEFAULT 30)
RETURNS TABLE (
  date date,
  total_users bigint,
  total_lockers bigint,
  dau bigint
)
LANGUAGE sql STABLE
AS $$
  WITH date_series AS (
    SELECT generate_series(
      (CURRENT_DATE - (days || ' days')::interval)::date,
      CURRENT_DATE,
      '1 day'::interval
    )::date AS d
  ),
  daily_users AS (
    SELECT d,
      (SELECT COUNT(*) FROM auth.users WHERE created_at::date <= d) AS total_users,
      (SELECT COUNT(DISTINCT user_id) FROM user_gear_items WHERE status = 'active' AND created_at::date <= d) AS total_lockers,
      (SELECT COUNT(DISTINCT user_id) FROM user_activities WHERE created_at::date = d) AS dau
    FROM date_series
  )
  SELECT d AS date, total_users, total_lockers, dau
  FROM daily_users
  ORDER BY d;
$$;

-- 2. Daily Retention (last N days) — feeds Retention Trend chart
CREATE OR REPLACE FUNCTION get_daily_retention(days integer DEFAULT 30)
RETURNS TABLE (
  date date,
  retention_7d numeric
)
LANGUAGE sql STABLE
AS $$
  WITH date_series AS (
    SELECT generate_series(
      (CURRENT_DATE - (days || ' days')::interval)::date,
      CURRENT_DATE,
      '1 day'::interval
    )::date AS d
  ),
  daily_retention AS (
    SELECT d,
      CASE
        WHEN (SELECT COUNT(*) FROM auth.users WHERE created_at::date = d - 7) = 0 THEN 0
        ELSE ROUND(
          (SELECT COUNT(DISTINCT ua.user_id)
           FROM user_activities ua
           JOIN auth.users u ON u.id = ua.user_id
           WHERE u.created_at::date = d - 7
             AND ua.created_at::date BETWEEN d - 6 AND d
          )::numeric /
          NULLIF((SELECT COUNT(*) FROM auth.users WHERE created_at::date = d - 7), 0) * 100,
          1
        )
      END AS retention_7d
    FROM date_series
  )
  SELECT d AS date, retention_7d
  FROM daily_retention
  ORDER BY d;
$$;

-- 3. Hourly Sync Health (last 24h) — feeds Sync Health stacked bar chart
CREATE OR REPLACE FUNCTION get_hourly_sync_health()
RETURNS TABLE (
  hour integer,
  success bigint,
  failed bigint
)
LANGUAGE sql STABLE
AS $$
  WITH hours AS (
    SELECT generate_series(0, 23) AS h
  ),
  today_logs AS (
    SELECT
      EXTRACT(HOUR FROM created_at)::integer AS h,
      CASE WHEN status = 'success' THEN 1 ELSE 0 END AS is_success,
      CASE WHEN status != 'success' THEN 1 ELSE 0 END AS is_failed
    FROM webhook_logs
    WHERE created_at >= CURRENT_DATE
  )
  SELECT
    hours.h AS hour,
    COALESCE(SUM(tl.is_success), 0) AS success,
    COALESCE(SUM(tl.is_failed), 0) AS failed
  FROM hours
  LEFT JOIN today_logs tl ON tl.h = hours.h
  GROUP BY hours.h
  ORDER BY hours.h;
$$;

-- Grant access to anon role (needed for Supabase client)
GRANT EXECUTE ON FUNCTION get_daily_growth(integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_daily_retention(integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_hourly_sync_health() TO anon, authenticated;
