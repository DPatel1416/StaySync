insert into public.permissions (code, description) values
  ('VIEW_ROOM_STATUS', 'View operational room-status changes'),
  ('VIEW_LOST_FOUND', 'View lost-and-found records'),
  ('VIEW_DEPARTMENT_SCORE', 'View department quality scores')
on conflict (code) do nothing;

insert into public.departments (organization_id, property_id, name, code, accent_color)
select property.organization_id, property.id, 'Food & Beverage', 'FOOD_BEVERAGE', 'sky'
from public.properties property
where property.archived_at is null
  and not exists (
    select 1 from public.departments department
    where department.property_id = property.id and department.code = 'FOOD_BEVERAGE'
  );

drop policy if exists tenant_property_read on public.service_requests;
create policy service_request_scoped_read on public.service_requests for select using (
  organization_id = public.current_organization_id()
  and public.has_property_access(property_id)
  and public.has_permission('VIEW_SERVICE_REQUEST', property_id)
);

drop policy if exists tenant_property_read on public.incidents;
create policy incident_scoped_read on public.incidents for select using (
  organization_id = public.current_organization_id()
  and public.has_property_access(property_id)
  and public.has_permission('VIEW_INCIDENT', property_id)
);
create policy incident_create on public.incidents for insert with check (
  organization_id = public.current_organization_id()
  and public.has_permission('CREATE_INCIDENT', property_id)
  and created_by = auth.uid()
);

drop policy if exists tenant_property_read on public.room_status_updates;
create policy room_status_scoped_read on public.room_status_updates for select using (
  organization_id = public.current_organization_id()
  and public.has_property_access(property_id)
  and public.has_permission('VIEW_ROOM_STATUS', property_id)
);

drop policy if exists tenant_property_read on public.work_orders;
create policy work_order_scoped_read on public.work_orders for select using (
  organization_id = public.current_organization_id()
  and public.has_property_access(property_id)
  and public.has_permission('VIEW_WORK_ORDER', property_id)
);

drop policy if exists tenant_property_read on public.lost_found_items;
create policy lost_found_scoped_read on public.lost_found_items for select using (
  organization_id = public.current_organization_id()
  and public.has_property_access(property_id)
  and public.has_permission('VIEW_LOST_FOUND', property_id)
);

drop policy if exists tenant_property_read on public.payment_discrepancies;
create policy payment_issue_scoped_read on public.payment_discrepancies for select using (
  organization_id = public.current_organization_id()
  and public.has_property_access(property_id)
  and public.has_permission('VIEW_PAYMENT_ISSUE', property_id)
);

drop policy if exists tenant_property_read on public.department_scores;
create policy department_score_scoped_read on public.department_scores for select using (
  organization_id = public.current_organization_id()
  and public.has_property_access(property_id)
  and (public.has_permission('VIEW_DEPARTMENT_SCORE', property_id) or public.has_permission('MANAGE_DEPARTMENT_SCORE', property_id))
);

drop policy if exists tenant_property_read on public.saved_report_templates;
create policy report_template_scoped_read on public.saved_report_templates for select using (
  organization_id = public.current_organization_id()
  and (property_id is null or public.has_property_access(property_id))
  and (property_id is null or public.has_permission('VIEW_REPORTS', property_id))
);

drop policy if exists tenant_property_read on public.notifications;
create policy notification_own_read on public.notifications for select using (
  organization_id = public.current_organization_id() and user_id = auth.uid()
);

drop policy if exists tenant_property_read on public.activity_events;
create policy activity_scoped_read on public.activity_events for select using (
  organization_id = public.current_organization_id()
  and public.has_property_access(property_id)
  and (
    (upper(entity_type) = 'INCIDENT' and public.has_permission('VIEW_INCIDENT', property_id))
    or (upper(entity_type) = 'OPERATION_LOG' and exists (select 1 from public.operation_logs log where log.id = entity_id))
    or public.has_permission('VIEW_REPORTS', property_id)
  )
);

drop policy if exists tenant_property_read on public.attachments;
create policy attachment_scoped_read on public.attachments for select using (
  organization_id = public.current_organization_id()
  and public.has_property_access(property_id)
  and (
    (upper(entity_type) = 'INCIDENT' and public.has_permission('VIEW_INCIDENT', property_id))
    or (upper(entity_type) = 'OPERATION_LOG' and exists (select 1 from public.operation_logs log where log.id = entity_id))
    or public.has_permission('VIEW_REPORTS', property_id)
  )
);

drop policy if exists attachment_objects_read on storage.objects;
create policy attachment_objects_scoped_read on storage.objects for select using (
  bucket_id = 'attachments'
  and exists (select 1 from public.attachments attachment where attachment.storage_path = name)
);
