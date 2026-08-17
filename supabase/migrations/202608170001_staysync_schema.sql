create extension if not exists pgcrypto;
create extension if not exists citext;

create type public.request_status as enum ('OPEN','ASSIGNED','IN_PROGRESS','WAITING','COMPLETED','CANCELLED');
create type public.priority_level as enum ('STANDARD','IMPORTANT','HIGH','URGENT');
create type public.activity_type as enum ('CREATED','COMMENT_ADDED','ASSIGNED','STATUS_CHANGED','PRIORITY_CHANGED','PHOTO_UPLOADED','COMPLETED','REOPENED','SCORE_UPDATED');

create table public.organizations (
  id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz
);
create table public.properties (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations on delete cascade,
  name text not null, code text not null, timezone text not null default 'America/Toronto', address jsonb not null default '{}',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz,
  unique (organization_id, code)
);
create table public.departments (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations on delete cascade,
  property_id uuid references public.properties on delete cascade, name text not null, code text not null,
  accent_color text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz,
  unique (property_id, code)
);
create table public.users (
  id uuid primary key references auth.users on delete cascade, organization_id uuid not null references public.organizations on delete cascade,
  home_property_id uuid references public.properties, department_id uuid references public.departments, username citext unique,
  display_name text not null, job_title text, account_kind text not null check (account_kind in ('EMPLOYEE','ACCOUNT_HOLDER')),
  is_active boolean not null default true, requires_password_change boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz
);
create table public.roles (
  id uuid primary key default gen_random_uuid(), organization_id uuid references public.organizations on delete cascade,
  name text not null, description text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (organization_id, name)
);
create table public.permissions (id uuid primary key default gen_random_uuid(), code text not null unique, description text not null);
create table public.role_permissions (role_id uuid not null references public.roles on delete cascade, permission_id uuid not null references public.permissions on delete cascade, primary key (role_id, permission_id));
create table public.user_properties (
  user_id uuid not null references public.users on delete cascade, property_id uuid not null references public.properties on delete cascade,
  role_id uuid not null references public.roles, is_default boolean not null default false, created_at timestamptz not null default now(), primary key (user_id, property_id)
);

create table public.service_requests (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations, property_id uuid not null references public.properties,
  department_id uuid references public.departments, requesting_department_id uuid references public.departments, assigned_department_id uuid references public.departments,
  title text not null, description text not null, room_or_location text, priority public.priority_level not null default 'STANDARD',
  status public.request_status not null default 'OPEN', due_at timestamptz, assigned_user_id uuid references public.users,
  created_by uuid not null references public.users, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz
);
create table public.incidents (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations, property_id uuid not null references public.properties,
  department_id uuid references public.departments, category text not null, room_or_location text, description text not null,
  priority public.priority_level not null default 'STANDARD', involved_department_ids uuid[] not null default '{}', assigned_manager_id uuid references public.users,
  status public.request_status not null default 'OPEN', created_by uuid not null references public.users,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz
);
create table public.operation_logs (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations, property_id uuid not null references public.properties,
  department_id uuid references public.departments, author_id uuid not null references public.users, content text not null,
  priority public.priority_level not null default 'STANDARD', is_pinned boolean not null default false, expires_at timestamptz,
  created_by uuid not null references public.users, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz
);
create table public.operation_log_replies (
  id uuid primary key default gen_random_uuid(), operation_log_id uuid not null references public.operation_logs on delete cascade,
  organization_id uuid not null references public.organizations, property_id uuid not null references public.properties,
  author_id uuid not null references public.users, content text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz
);
create table public.room_status_updates (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations, property_id uuid not null references public.properties,
  department_id uuid references public.departments, room_number text not null, change_type text not null,
  previous_status text, new_status text not null, operational_note text not null, effective_at timestamptz not null default now(),
  acknowledged_at timestamptz, acknowledged_by uuid references public.users, created_by uuid not null references public.users,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz
);
create table public.work_orders (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations, property_id uuid not null references public.properties,
  department_id uuid references public.departments, title text not null, description text not null, room_or_location text,
  category text not null, priority public.priority_level not null default 'STANDARD', assigned_user_id uuid references public.users,
  status public.request_status not null default 'OPEN', completion_notes text, completed_at timestamptz,
  created_by uuid not null references public.users, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz
);
create table public.lost_found_items (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations, property_id uuid not null references public.properties,
  department_id uuid references public.departments, item_description text not null, found_location text not null, found_at timestamptz not null,
  found_by uuid not null references public.users, storage_location text not null, guest_follow_up_status text not null default 'NOT_STARTED',
  fulfillment_status text, notes text, final_disposition text, created_by uuid not null references public.users,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz
);
create table public.payment_discrepancies (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations, property_id uuid not null references public.properties,
  department_id uuid references public.departments, room_or_reservation_ref text, issue_type text not null, amount numeric(12,2), currency char(3) default 'CAD',
  source text not null, description text not null, assigned_user_id uuid references public.users, status public.request_status not null default 'OPEN',
  notes text, created_by uuid not null references public.users, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz
);
create table public.department_scores (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations, property_id uuid not null references public.properties,
  department_id uuid not null references public.departments, score numeric(5,2) not null check (score between 0 and 100),
  target_score numeric(5,2) check (target_score between 0 and 100), review_date date not null, review_type text not null, comments text,
  created_by uuid not null references public.users, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz
);
create table public.activity_events (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations, property_id uuid not null references public.properties,
  entity_type text not null, entity_id uuid not null, event_type public.activity_type not null, actor_id uuid not null references public.users,
  details jsonb not null default '{}', created_at timestamptz not null default now()
);
create table public.attachments (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations, property_id uuid not null references public.properties,
  entity_type text not null, entity_id uuid not null, storage_path text not null, file_name text not null, content_type text not null, size_bytes bigint not null,
  uploaded_by uuid not null references public.users, created_at timestamptz not null default now(), archived_at timestamptz
);
create table public.saved_report_templates (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations, property_id uuid references public.properties,
  name text not null, report_type text not null, filters jsonb not null default '{}', columns jsonb not null default '[]', is_shared boolean not null default false,
  created_by uuid not null references public.users, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz
);
create table public.notifications (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations, property_id uuid not null references public.properties,
  user_id uuid not null references public.users, title text not null, body text not null, entity_type text, entity_id uuid, read_at timestamptz,
  created_at timestamptz not null default now(), archived_at timestamptz
);

create index service_requests_scope_idx on public.service_requests (organization_id, property_id, status, created_at desc) where archived_at is null;
create index operation_logs_scope_idx on public.operation_logs (organization_id, property_id, is_pinned desc, created_at desc) where archived_at is null;
create index work_orders_assignee_idx on public.work_orders (property_id, assigned_user_id, status) where archived_at is null;
create index room_updates_property_idx on public.room_status_updates (property_id, effective_at desc) where archived_at is null;
create index activity_entity_idx on public.activity_events (entity_type, entity_id, created_at);
create index notifications_user_idx on public.notifications (user_id, read_at, created_at desc) where archived_at is null;

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
do $$ declare t text; begin foreach t in array array['organizations','properties','departments','users','roles','service_requests','incidents','operation_logs','operation_log_replies','room_status_updates','work_orders','lost_found_items','payment_discrepancies','department_scores','saved_report_templates'] loop execute format('create trigger touch_updated_at before update on public.%I for each row execute function public.touch_updated_at()', t); end loop; end $$;

create or replace function public.current_organization_id() returns uuid language sql stable security definer set search_path = public as $$ select organization_id from public.users where id = auth.uid() and is_active and archived_at is null $$;
create or replace function public.has_property_access(target_property uuid) returns boolean language sql stable security definer set search_path = public as $$ select exists(select 1 from public.user_properties where user_id = auth.uid() and property_id = target_property) $$;
create or replace function public.has_permission(permission_code text, target_property uuid) returns boolean language sql stable security definer set search_path = public as $$ select exists(select 1 from public.user_properties up join public.role_permissions rp on rp.role_id = up.role_id join public.permissions p on p.id = rp.permission_id where up.user_id = auth.uid() and up.property_id = target_property and p.code = permission_code) $$;
create or replace function public.employee_login_identity(login_username text) returns text language sql stable security definer set search_path = public, auth as $$ select au.email from public.users u join auth.users au on au.id = u.id where lower(u.username::text) = lower(login_username) and u.account_kind = 'EMPLOYEE' and u.is_active and u.archived_at is null limit 1 $$;
revoke all on function public.employee_login_identity(text) from public, anon, authenticated;
grant execute on function public.employee_login_identity(text) to service_role;

alter table public.organizations enable row level security;
alter table public.properties enable row level security;
alter table public.departments enable row level security;
alter table public.users enable row level security;
alter table public.user_properties enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;

create policy org_read on public.organizations for select using (id = public.current_organization_id());
create policy property_read on public.properties for select using (organization_id = public.current_organization_id() and public.has_property_access(id));
create policy department_read on public.departments for select using (organization_id = public.current_organization_id() and (property_id is null or public.has_property_access(property_id)));
create policy user_read on public.users for select using (organization_id = public.current_organization_id() and (id = auth.uid() or home_property_id is null or public.has_property_access(home_property_id)));
create policy own_property_membership_read on public.user_properties for select using (user_id = auth.uid() or public.has_permission('MANAGE_USERS', property_id));
create policy role_read on public.roles for select using (organization_id is null or organization_id = public.current_organization_id());
create policy permission_read on public.permissions for select using (auth.uid() is not null);
create policy role_permission_read on public.role_permissions for select using (auth.uid() is not null);

do $$ declare t text; begin foreach t in array array['service_requests','incidents','operation_logs','operation_log_replies','room_status_updates','work_orders','lost_found_items','payment_discrepancies','department_scores','activity_events','attachments','saved_report_templates','notifications'] loop execute format('alter table public.%I enable row level security', t); execute format('create policy tenant_property_read on public.%I for select using (organization_id = public.current_organization_id() and public.has_property_access(property_id))', t); end loop; end $$;

create policy service_request_create on public.service_requests for insert with check (organization_id = public.current_organization_id() and public.has_permission('CREATE_SERVICE_REQUEST', property_id) and created_by = auth.uid());
create policy service_request_update on public.service_requests for update using (public.has_permission('ASSIGN_SERVICE_REQUEST', property_id) or created_by = auth.uid()) with check (organization_id = public.current_organization_id());
create policy operation_log_create on public.operation_logs for insert with check (organization_id = public.current_organization_id() and public.has_permission('CREATE_OPERATION_LOG', property_id) and author_id = auth.uid() and created_by = auth.uid());
create policy room_update_create on public.room_status_updates for insert with check (organization_id = public.current_organization_id() and public.has_permission('UPDATE_ROOM_STATUS', property_id) and created_by = auth.uid());
create policy work_order_create on public.work_orders for insert with check (organization_id = public.current_organization_id() and public.has_permission('CREATE_WORK_ORDER', property_id) and created_by = auth.uid());
create policy score_manage on public.department_scores for all using (public.has_permission('MANAGE_DEPARTMENT_SCORE', property_id)) with check (organization_id = public.current_organization_id() and public.has_permission('MANAGE_DEPARTMENT_SCORE', property_id));
create policy notification_own on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());

alter publication supabase_realtime add table public.service_requests, public.operation_logs, public.room_status_updates, public.work_orders, public.notifications;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('attachments', 'attachments', false, 26214400, array['image/jpeg','image/png','image/webp','application/pdf','text/plain']) on conflict (id) do nothing;
create policy attachment_objects_read on storage.objects for select using (bucket_id = 'attachments' and public.has_property_access((storage.foldername(name))[1]::uuid));
create policy attachment_objects_create on storage.objects for insert with check (bucket_id = 'attachments' and public.has_property_access((storage.foldername(name))[1]::uuid));
