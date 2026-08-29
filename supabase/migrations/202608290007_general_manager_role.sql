-- Present the primary organization account as the General Manager while
-- preserving existing memberships and permissions created under the legacy name.
do $$
declare
  legacy_role record;
  general_manager_role_id uuid;
begin
  for legacy_role in
    select id, organization_id
    from public.roles
    where name = 'Account Holder'
  loop
    select id into general_manager_role_id
    from public.roles
    where organization_id = legacy_role.organization_id
      and name = 'General Manager'
    limit 1;

    if general_manager_role_id is null then
      update public.roles
      set name = 'General Manager',
          description = 'Primary General Manager with organization-wide administrative access'
      where id = legacy_role.id;
    else
      insert into public.role_permissions (role_id, permission_id)
      select general_manager_role_id, permission_id
      from public.role_permissions
      where role_id = legacy_role.id
      on conflict do nothing;

      update public.user_properties
      set role_id = general_manager_role_id
      where role_id = legacy_role.id;

      delete from public.roles where id = legacy_role.id;
    end if;
  end loop;
end $$;

update public.users
set job_title = 'General Manager'
where account_kind = 'ACCOUNT_HOLDER'
  and (job_title is null or job_title = 'Account Holder');

-- General Managers and Assistant General Managers operate the Management
-- workspace. Billing visibility remains restricted in the application to the
-- primary ACCOUNT_HOLDER account.
insert into public.role_permissions (role_id, permission_id)
select role.id, permission.id
from public.roles role
cross join public.permissions permission
where role.name in ('General Manager', 'Account Holder', 'Assistant General Manager')
on conflict do nothing;
