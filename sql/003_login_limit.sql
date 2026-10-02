-- Login brute-force limit (per IP + global), used by app/api/login/route.ts.
-- Safe to re-run. Run in the Supabase SQL editor.

create table if not exists blt.login_attempts (
  id bigint generated always as identity primary key,
  ip text not null,
  at timestamptz not null default now()
);
create index if not exists login_attempts_ip_at on blt.login_attempts (ip, at);
create index if not exists login_attempts_at on blt.login_attempts (at);
alter table blt.login_attempts enable row level security; -- no policies: only service_role (bypasses RLS) can touch it

-- ---------------------------------------------------------------------------
-- Reserve one attempt. Every attempt is recorded *before* the password is checked,
-- so parallel requests can't slip past the limit; a successful login removes its row
-- again (login_succeeded), so only failures count. Blocked attempts are not recorded.
-- Returns {"allowed": true, "id": n} or {"allowed": false, "retry_after": seconds}.
-- ---------------------------------------------------------------------------

create or replace function blt.login_attempt(p_ip text, p_ip_max int, p_ip_window_s int, p_all_max int, p_all_window_s int)
returns jsonb language plpgsql volatile
set search_path = blt, public as $$
declare
  ip_n int; ip_oldest timestamptz;
  all_n int; all_oldest timestamptz;
  wait_s int := 0;
  new_id bigint;
begin
  perform pg_advisory_xact_lock(hashtext('blt.login_attempt')); -- serialize: count + insert is atomic

  delete from login_attempts where at < now() - interval '1 day';

  -- n-th newest attempt in the window: once it ages out, one more attempt is allowed
  select count(*) into ip_n from login_attempts where ip = p_ip and at > now() - make_interval(secs => p_ip_window_s);
  select count(*) into all_n from login_attempts where at > now() - make_interval(secs => p_all_window_s);

  if ip_n >= p_ip_max then
    select at into ip_oldest from login_attempts where ip = p_ip order by at desc offset p_ip_max - 1 limit 1;
    wait_s := greatest(wait_s, ceil(extract(epoch from ip_oldest + make_interval(secs => p_ip_window_s) - now()))::int);
  end if;
  if all_n >= p_all_max then
    select at into all_oldest from login_attempts order by at desc offset p_all_max - 1 limit 1;
    wait_s := greatest(wait_s, ceil(extract(epoch from all_oldest + make_interval(secs => p_all_window_s) - now()))::int);
  end if;
  if wait_s > 0 then
    return jsonb_build_object('allowed', false, 'retry_after', wait_s);
  end if;

  insert into login_attempts (ip) values (p_ip) returning id into new_id;
  return jsonb_build_object('allowed', true, 'id', new_id);
end $$;

-- Correct password: the attempt doesn't count, and the IP's earlier failures are forgiven.
create or replace function blt.login_succeeded(p_id bigint, p_ip text)
returns void language sql volatile
set search_path = blt, public as $$
  delete from login_attempts where id = p_id or ip = p_ip
$$;

grant select, insert, delete on blt.login_attempts to service_role;
grant execute on function blt.login_attempt(text, int, int, int, int), blt.login_succeeded(bigint, text) to service_role;
