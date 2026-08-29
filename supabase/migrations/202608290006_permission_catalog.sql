-- Permission codes are application configuration, not tenant or sample data.
insert into public.permissions (code, description) values
('CREATE_SERVICE_REQUEST','Create operational service requests'),
('VIEW_SERVICE_REQUEST','View scoped service requests'),
('ASSIGN_SERVICE_REQUEST','Assign and update requests'),
('CREATE_INCIDENT','Create incidents'),
('VIEW_INCIDENT','View scoped incidents'),
('UPDATE_ROOM_STATUS','Publish room status changes'),
('CREATE_OPERATION_LOG','Publish operations log entries'),
('VIEW_PAYMENT_ISSUE','View payment discrepancies'),
('MANAGE_DEPARTMENT_SCORE','Create and update quality scores'),
('VIEW_REPORTS','Build and export reports'),
('MANAGE_USERS','Manage employee access'),
('MANAGE_PROPERTIES','Manage organization properties'),
('CREATE_WORK_ORDER','Create maintenance work orders'),
('VIEW_WORK_ORDER','View maintenance work orders'),
('VIEW_ROOM_STATUS','View operational room-status changes'),
('VIEW_LOST_FOUND','View lost-and-found records'),
('VIEW_DEPARTMENT_SCORE','View department quality scores')
on conflict (code) do update set description = excluded.description;
