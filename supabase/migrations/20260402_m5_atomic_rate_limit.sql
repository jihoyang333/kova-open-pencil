-- Atomic rate-limit check-and-increment for the AI proxy.
-- Uses SELECT ... FOR UPDATE to prevent concurrent requests from
-- both reading the same counter value before either increments it.

CREATE OR REPLACE FUNCTION try_increment_generation(p_user_id UUID, p_daily_limit INTEGER DEFAULT 200)
RETURNS TABLE(allowed BOOLEAN, current_count INTEGER) AS $$
DECLARE
  v_count   INTEGER;
  v_reset   TIMESTAMPTZ;
BEGIN
  -- Lock the row for this user to serialize concurrent callers
  SELECT generations_used, generations_reset_at
    INTO v_count, v_reset
    FROM users
   WHERE id = p_user_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0;
    RETURN;
  END IF;

  -- Reset counter on a new UTC day
  IF v_reset IS NULL OR v_reset::date < CURRENT_DATE THEN
    v_count := 0;
  END IF;

  -- Already at or over limit → reject
  IF COALESCE(v_count, 0) >= p_daily_limit THEN
    RETURN QUERY SELECT FALSE, COALESCE(v_count, 0);
    RETURN;
  END IF;

  -- Increment and persist
  UPDATE users
     SET generations_used   = COALESCE(v_count, 0) + 1,
         generations_reset_at = NOW()
   WHERE id = p_user_id;

  RETURN QUERY SELECT TRUE, COALESCE(v_count, 0) + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
