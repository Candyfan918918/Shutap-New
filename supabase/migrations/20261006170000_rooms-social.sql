-- Rooms become a feed: posts by topic, likes, saves, follows, reports,
-- notifications. Additive only; re-runnable. Every read and write goes
-- through server functions on the service role, so the new tables carry RLS
-- with no client policies.

-- posts: a topic, the card they came from, and a hide switch for reports
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS topic text;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS card_id uuid;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false;
DO $$ BEGIN
  ALTER TABLE public.rooms ADD CONSTRAINT rooms_topic_check
    CHECK (topic IS NULL OR topic IN ('office','work','family','school','live','social'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_rooms_topic_created ON public.rooms (topic, created_at DESC);
GRANT SELECT (topic, card_id, hidden) ON public.rooms TO anon, authenticated;

-- likes reuse room_relates (one row per user per post)

-- saves
CREATE TABLE IF NOT EXISTS public.room_saves (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, room_id)
);
ALTER TABLE public.room_saves ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.room_saves TO service_role;

-- follows
CREATE TABLE IF NOT EXISTS public.follows (
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  followee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, followee_id),
  CHECK (follower_id <> followee_id)
);
CREATE INDEX IF NOT EXISTS idx_follows_followee ON public.follows (followee_id);
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.follows TO service_role;

-- reports
CREATE TABLE IF NOT EXISTS public.post_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  comment_id uuid,
  reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text NOT NULL CHECK (reason IN ('targets_a_person','real_name','hateful','spam','other')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_post_reports_room ON public.post_reports (room_id);
ALTER TABLE public.post_reports ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.post_reports TO service_role;

-- notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('follow','like','comment')),
  room_id uuid REFERENCES public.rooms(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications (user_id, created_at DESC);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.notifications TO service_role;
