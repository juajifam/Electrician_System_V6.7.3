-- 전기기능사 실습실 예약·관리 시스템 공용 예약 DB 보완 설정
-- Supabase > SQL Editor에서 전체를 붙여넣고 Run 하세요.

create extension if not exists btree_gist;

alter table public.reservations
    add column if not exists military_id text not null default '',
    add column if not exists unit text not null default '',
    add column if not exists time_slot text,
    add column if not exists client_created_at timestamptz;

update public.reservations
set time_slot = coalesce(time_slot, period),
    client_created_at = coalesce(client_created_at, created_at)
where time_slot is null or client_created_at is null;

alter table public.reservations
    alter column time_slot set not null;

alter table public.reservations
    drop constraint if exists reservations_time_slot_check;

alter table public.reservations
    add constraint reservations_time_slot_check
    check (time_slot in ('morning', 'afternoon', 'full'));

-- 같은 날짜·작업대에서 오전/오후/하루종일이 겹치지 않도록 DB에서 최종 차단
alter table public.reservations
    add column if not exists slot_range int4range
    generated always as (
        case time_slot
            when 'morning' then int4range(1, 2, '[)')
            when 'afternoon' then int4range(2, 3, '[)')
            when 'full' then int4range(1, 3, '[)')
        end
    ) stored;

alter table public.reservations
    drop constraint if exists reservations_no_station_overlap;

alter table public.reservations
    add constraint reservations_no_station_overlap
    exclude using gist (
        reservation_date with =,
        workstation with =,
        slot_range with &&
    );

-- 동일 군번은 같은 날짜에 1건만 예약
create unique index if not exists reservations_one_per_person_per_day
on public.reservations (reservation_date, military_id)
where military_id <> '';

alter table public.reservations enable row level security;

drop policy if exists "public read reservations" on public.reservations;
create policy "public read reservations"
on public.reservations for select
to anon, authenticated
using (true);

drop policy if exists "public insert reservations" on public.reservations;
create policy "public insert reservations"
on public.reservations for insert
to anon, authenticated
with check (true);

drop policy if exists "public update reservations" on public.reservations;
create policy "public update reservations"
on public.reservations for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "public delete reservations" on public.reservations;
create policy "public delete reservations"
on public.reservations for delete
to anon, authenticated
using (true);

-- Realtime 게시 대상에 추가(이미 추가되어 있으면 오류 없이 넘어가도록 처리)
do $$
begin
    alter publication supabase_realtime add table public.reservations;
exception
    when duplicate_object then null;
end $$;
