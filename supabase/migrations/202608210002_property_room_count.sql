alter table public.properties
  add column if not exists room_count integer
  check (room_count is null or room_count between 1 and 10000);

update public.properties set room_count = 142 where code = 'YOW-DT' and room_count is null;
update public.properties set room_count = 118 where code = 'YOW-AP' and room_count is null;
