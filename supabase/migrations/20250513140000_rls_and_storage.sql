-- Row Level Security + Storage for Supabase-only app (no Express).
-- Apply after initial_app_schema. Re-run safe: drops policies by name first.

-- ---------------------------------------------------------------------------
-- Storage buckets (public read for audio/art discovery)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('covers', 'covers', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']::text[]),
  ('tracks', 'tracks', true, 10485760, ARRAY['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/aac', 'audio/flac']::text[])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policies: authenticated users upload under their user-id prefix
DROP POLICY IF EXISTS "covers read" ON storage.objects;
CREATE POLICY "covers read" ON storage.objects FOR SELECT USING (bucket_id = 'covers');

DROP POLICY IF EXISTS "covers insert own" ON storage.objects;
CREATE POLICY "covers insert own" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'covers'
  AND split_part(name, '/', 1) = auth.uid()::text
);

DROP POLICY IF EXISTS "covers update own" ON storage.objects;
CREATE POLICY "covers update own" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'covers' AND split_part(name, '/', 1) = auth.uid()::text)
WITH CHECK (bucket_id = 'covers' AND split_part(name, '/', 1) = auth.uid()::text);

DROP POLICY IF EXISTS "covers delete own" ON storage.objects;
CREATE POLICY "covers delete own" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'covers' AND split_part(name, '/', 1) = auth.uid()::text);

DROP POLICY IF EXISTS "tracks read" ON storage.objects;
CREATE POLICY "tracks read" ON storage.objects FOR SELECT USING (bucket_id = 'tracks');

DROP POLICY IF EXISTS "tracks insert own" ON storage.objects;
CREATE POLICY "tracks insert own" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'tracks'
  AND split_part(name, '/', 1) = auth.uid()::text
);

DROP POLICY IF EXISTS "tracks update own" ON storage.objects;
CREATE POLICY "tracks update own" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'tracks' AND split_part(name, '/', 1) = auth.uid()::text)
WITH CHECK (bucket_id = 'tracks' AND split_part(name, '/', 1) = auth.uid()::text);

DROP POLICY IF EXISTS "tracks delete own" ON storage.objects;
CREATE POLICY "tracks delete own" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'tracks' AND split_part(name, '/', 1) = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- Helper: not banned (reusable in policies)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_banned(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT banned FROM public.users WHERE id = uid::text), false);
$$;

CREATE OR REPLACE FUNCTION public.is_premium_or_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = uid::text
      AND (
        u.is_admin = true
        OR (u.subscription_status = 'active' AND u.subscription_tier = 'premium')
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- public.users
-- ---------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_select ON public.users;
CREATE POLICY users_select ON public.users FOR SELECT USING (true);

DROP POLICY IF EXISTS users_insert_self ON public.users;
CREATE POLICY users_insert_self ON public.users FOR INSERT TO authenticated
WITH CHECK (id = auth.uid()::text AND NOT public.is_banned(auth.uid()));

DROP POLICY IF EXISTS users_update_self ON public.users;
CREATE POLICY users_update_self ON public.users FOR UPDATE TO authenticated
USING (id = auth.uid()::text AND NOT public.is_banned(auth.uid()))
WITH CHECK (id = auth.uid()::text);

DROP POLICY IF EXISTS users_admin_update ON public.users;
CREATE POLICY users_admin_update ON public.users FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.users me WHERE me.id = auth.uid()::text AND me.is_admin = true)
  AND NOT public.is_banned(auth.uid())
)
WITH CHECK (true);

DROP POLICY IF EXISTS users_delete_admin ON public.users;
CREATE POLICY users_delete_admin ON public.users FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.users me WHERE me.id = auth.uid()::text AND me.is_admin = true)
);

-- ---------------------------------------------------------------------------
-- albums
-- ---------------------------------------------------------------------------
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS albums_select ON public.albums;
CREATE POLICY albums_select ON public.albums FOR SELECT USING (true);

DROP POLICY IF EXISTS albums_insert ON public.albums;
CREATE POLICY albums_insert ON public.albums FOR INSERT TO authenticated
WITH CHECK (
  artist_id = auth.uid()::text
  AND NOT public.is_banned(auth.uid())
  AND public.is_premium_or_admin(auth.uid())
);

DROP POLICY IF EXISTS albums_update_own ON public.albums;
CREATE POLICY albums_update_own ON public.albums FOR UPDATE TO authenticated
USING (artist_id = auth.uid()::text AND NOT public.is_banned(auth.uid()))
WITH CHECK (artist_id = auth.uid()::text);

DROP POLICY IF EXISTS albums_delete_own_or_admin ON public.albums;
CREATE POLICY albums_delete_own_or_admin ON public.albums FOR DELETE TO authenticated
USING (
  NOT public.is_banned(auth.uid())
  AND (
    artist_id = auth.uid()::text
    OR EXISTS (SELECT 1 FROM public.users me WHERE me.id = auth.uid()::text AND me.is_admin = true)
  )
);

-- ---------------------------------------------------------------------------
-- songs
-- ---------------------------------------------------------------------------
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS songs_select ON public.songs;
CREATE POLICY songs_select ON public.songs FOR SELECT USING (true);

DROP POLICY IF EXISTS songs_insert ON public.songs;
CREATE POLICY songs_insert ON public.songs FOR INSERT TO authenticated
WITH CHECK (
  NOT public.is_banned(auth.uid())
  AND public.is_premium_or_admin(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.albums a
    WHERE a.id = album_id AND a.artist_id = auth.uid()::text
  )
);

DROP POLICY IF EXISTS songs_update_own ON public.songs;
CREATE POLICY songs_update_own ON public.songs FOR UPDATE TO authenticated
USING (
  NOT public.is_banned(auth.uid())
  AND EXISTS (SELECT 1 FROM public.albums a WHERE a.id = album_id AND a.artist_id = auth.uid()::text)
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.albums a WHERE a.id = album_id AND a.artist_id = auth.uid()::text)
);

DROP POLICY IF EXISTS songs_delete_own_or_admin ON public.songs;
CREATE POLICY songs_delete_own_or_admin ON public.songs FOR DELETE TO authenticated
USING (
  NOT public.is_banned(auth.uid())
  AND (
    EXISTS (SELECT 1 FROM public.albums a WHERE a.id = album_id AND a.artist_id = auth.uid()::text)
    OR EXISTS (SELECT 1 FROM public.users me WHERE me.id = auth.uid()::text AND me.is_admin = true)
  )
);

-- ---------------------------------------------------------------------------
-- tracks
-- ---------------------------------------------------------------------------
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tracks_select ON public.tracks;
CREATE POLICY tracks_select ON public.tracks FOR SELECT USING (true);

DROP POLICY IF EXISTS tracks_insert ON public.tracks;
CREATE POLICY tracks_insert ON public.tracks FOR INSERT TO authenticated
WITH CHECK (
  NOT public.is_banned(auth.uid())
  AND public.is_premium_or_admin(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.songs s
    JOIN public.albums a ON a.id = s.album_id
    WHERE s.id = song_id AND a.artist_id = auth.uid()::text
  )
);

DROP POLICY IF EXISTS tracks_update_own ON public.tracks;
CREATE POLICY tracks_update_own ON public.tracks FOR UPDATE TO authenticated
USING (
  NOT public.is_banned(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.songs s
    JOIN public.albums a ON a.id = s.album_id
    WHERE s.id = song_id AND a.artist_id = auth.uid()::text
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.songs s
    JOIN public.albums a ON a.id = s.album_id
    WHERE s.id = song_id AND a.artist_id = auth.uid()::text
  )
);

DROP POLICY IF EXISTS tracks_delete_own_or_admin ON public.tracks;
CREATE POLICY tracks_delete_own_or_admin ON public.tracks FOR DELETE TO authenticated
USING (
  NOT public.is_banned(auth.uid())
  AND (
    EXISTS (
      SELECT 1 FROM public.songs s
      JOIN public.albums a ON a.id = s.album_id
      WHERE s.id = song_id AND a.artist_id = auth.uid()::text
    )
    OR EXISTS (SELECT 1 FROM public.users me WHERE me.id = auth.uid()::text AND me.is_admin = true)
  )
);

-- ---------------------------------------------------------------------------
-- subscriptions, likes, favorites
-- ---------------------------------------------------------------------------
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS subscriptions_select ON public.subscriptions;
CREATE POLICY subscriptions_select ON public.subscriptions FOR SELECT USING (true);
DROP POLICY IF EXISTS subscriptions_insert ON public.subscriptions;
CREATE POLICY subscriptions_insert ON public.subscriptions FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid()::text AND NOT public.is_banned(auth.uid()));
DROP POLICY IF EXISTS subscriptions_delete_own ON public.subscriptions;
CREATE POLICY subscriptions_delete_own ON public.subscriptions FOR DELETE TO authenticated
USING (user_id = auth.uid()::text AND NOT public.is_banned(auth.uid()));

ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS likes_select ON public.likes;
CREATE POLICY likes_select ON public.likes FOR SELECT USING (true);
DROP POLICY IF EXISTS likes_insert ON public.likes;
CREATE POLICY likes_insert ON public.likes FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid()::text AND NOT public.is_banned(auth.uid()));
DROP POLICY IF EXISTS likes_delete_own ON public.likes;
CREATE POLICY likes_delete_own ON public.likes FOR DELETE TO authenticated
USING (user_id = auth.uid()::text);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS favorites_select ON public.favorites;
CREATE POLICY favorites_select ON public.favorites FOR SELECT USING (true);
DROP POLICY IF EXISTS favorites_insert ON public.favorites;
CREATE POLICY favorites_insert ON public.favorites FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid()::text AND NOT public.is_banned(auth.uid()));
DROP POLICY IF EXISTS favorites_delete_own ON public.favorites;
CREATE POLICY favorites_delete_own ON public.favorites FOR DELETE TO authenticated
USING (user_id = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- songwriting_songs
-- ---------------------------------------------------------------------------
ALTER TABLE public.songwriting_songs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS songwriting_select ON public.songwriting_songs;
CREATE POLICY songwriting_select ON public.songwriting_songs FOR SELECT USING (
  is_public = true OR user_id = auth.uid()::text
);
DROP POLICY IF EXISTS songwriting_insert ON public.songwriting_songs;
CREATE POLICY songwriting_insert ON public.songwriting_songs FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()::text
  AND NOT public.is_banned(auth.uid())
  AND public.is_premium_or_admin(auth.uid())
);
DROP POLICY IF EXISTS songwriting_update_own ON public.songwriting_songs;
CREATE POLICY songwriting_update_own ON public.songwriting_songs FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()::text
  AND NOT public.is_banned(auth.uid())
  AND public.is_premium_or_admin(auth.uid())
)
WITH CHECK (user_id = auth.uid()::text);
DROP POLICY IF EXISTS songwriting_delete_own ON public.songwriting_songs;
CREATE POLICY songwriting_delete_own ON public.songwriting_songs FOR DELETE TO authenticated
USING (
  user_id = auth.uid()::text
  AND NOT public.is_banned(auth.uid())
  AND public.is_premium_or_admin(auth.uid())
);

-- ---------------------------------------------------------------------------
-- stripe_events: no client access (service role only)
-- ---------------------------------------------------------------------------
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;
