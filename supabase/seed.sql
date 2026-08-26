-- Stable IDs make UI fixtures and integration tests deterministic.
insert into public.organizations (id, name, slug) values ('10000000-0000-0000-0000-000000000001', 'Northstar Hotels', 'northstar-hotels');
insert into public.properties (id, organization_id, name, code, timezone) values
('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Ottawa Downtown','YOW-DT','America/Toronto'),
('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','Ottawa Airport','YOW-AP','America/Toronto');
insert into public.departments (id, organization_id, property_id, name, code, accent_color) values
('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Front Desk','FRONT_DESK','indigo'),
('30000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Housekeeping','HOUSEKEEPING','teal'),
('30000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Maintenance','MAINTENANCE','amber'),
('30000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Management','MANAGEMENT','slate'),
('30000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Food & Beverage','FOOD_BEVERAGE','sky');
insert into public.permissions (code, description) values
('CREATE_SERVICE_REQUEST','Create operational service requests'),('VIEW_SERVICE_REQUEST','View scoped service requests'),('ASSIGN_SERVICE_REQUEST','Assign and update requests'),
('CREATE_INCIDENT','Create incidents'),('VIEW_INCIDENT','View scoped incidents'),('UPDATE_ROOM_STATUS','Publish room status changes'),
('CREATE_OPERATION_LOG','Publish operations log entries'),('VIEW_PAYMENT_ISSUE','View payment discrepancies'),('MANAGE_DEPARTMENT_SCORE','Create and update quality scores'),
('VIEW_REPORTS','Build and export reports'),('MANAGE_USERS','Manage employee access'),('MANAGE_PROPERTIES','Manage organization properties'),
('CREATE_WORK_ORDER','Create maintenance work orders'),('VIEW_WORK_ORDER','View maintenance work orders'),
('VIEW_ROOM_STATUS','View operational room-status changes'),('VIEW_LOST_FOUND','View lost-and-found records'),('VIEW_DEPARTMENT_SCORE','View department quality scores');
-- Auth-backed demo users are created by scripts/seed-auth.ts or through the Supabase dashboard before application records.
