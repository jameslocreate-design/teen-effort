
-- Delete duplicate partner_links per user pair, keeping the earliest one
WITH ranked AS (
  SELECT
    id,
    LEAST(user1_id, user2_id) AS a,
    GREATEST(user1_id, user2_id) AS b,
    ROW_NUMBER() OVER (
      PARTITION BY LEAST(user1_id, user2_id), GREATEST(user1_id, user2_id)
      ORDER BY (status = 'accepted') DESC, created_at ASC
    ) AS rn
  FROM public.partner_links
)
DELETE FROM public.partner_links
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Prevent future duplicates regardless of which user is user1 vs user2
CREATE UNIQUE INDEX IF NOT EXISTS partner_links_unique_pair
  ON public.partner_links (
    LEAST(user1_id, user2_id),
    GREATEST(user1_id, user2_id)
  );
