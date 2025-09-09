-- Ensure unique votes per user per poll (for authenticated users)
-- Partial unique index applies only when user_id is not null
create unique index if not exists votes_poll_user_unique
  on public.votes(poll_id, user_id)
  where user_id is not null;
