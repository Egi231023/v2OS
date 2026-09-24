insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('projectos-demo-private','projectos-demo-private',false,5242880,array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;
-- This bucket has no anon or authenticated policies. Files are handled by the trusted Edge gateway,
-- then re-authorized by the Site for each request.
