-- StaySync displays one current score per property department. The prior value
-- is retained only to render the up/down indicator; it is not a score history.
alter table public.department_scores
  add column if not exists previous_score numeric(5,2)
  check (previous_score between 0 and 100);

-- Keep the newest existing score current and archive older duplicates before
-- enforcing the one-row rule on upgraded databases.
with ranked as (
  select id, row_number() over (
    partition by organization_id, property_id, department_id
    order by review_date desc, created_at desc
  ) as position
  from public.department_scores
  where archived_at is null
)
update public.department_scores as score
set archived_at = now()
from ranked
where score.id = ranked.id and ranked.position > 1;

create unique index if not exists one_current_department_score
  on public.department_scores (organization_id, property_id, department_id)
  where archived_at is null;
