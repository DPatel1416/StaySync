alter table public.properties
  add column if not exists operational_status text not null default 'ACTIVE'
  check (operational_status in ('ACTIVE', 'PRE_OPENING', 'TEMPORARILY_CLOSED'));

drop policy if exists role_permission_read on public.role_permissions;
create policy role_permission_read on public.role_permissions for select using (
  exists (
    select 1 from public.roles role
    where role.id = role_id
      and (role.organization_id is null or role.organization_id = public.current_organization_id())
  )
);

drop policy if exists permission_read on public.permissions;
create policy permission_read on public.permissions for select using (
  auth.uid() is not null and exists (
    select 1
    from public.role_permissions scoped_role_permission
    join public.user_properties membership on membership.role_id = scoped_role_permission.role_id
    where membership.user_id = auth.uid()
      and scoped_role_permission.permission_id = permissions.id
  )
);

create policy property_manage on public.properties for all
using (
  organization_id = public.current_organization_id()
  and public.has_permission('MANAGE_PROPERTIES', id)
)
with check (organization_id = public.current_organization_id());

create index if not exists users_active_scope_idx
  on public.users (organization_id, home_property_id, is_active)
  where archived_at is null;

create index if not exists user_properties_user_scope_idx
  on public.user_properties (user_id, property_id, role_id);
