SELECT cron.schedule(
  'process-scheduled-requests',
  '* * * * *',
  $$
  SELECT net.http_post(
    url:='https://ktdhzfavmpfkcrwahdvm.supabase.co/functions/v1/process-scheduled-requests',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0ZGh6ZmF2bXBma2Nyd2FoZHZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNzUzMjcsImV4cCI6MjA4NTY1MTMyN30.AqZFk5ptJOITrpOhSqKSJvC1hMdIOCbQjAYQeKhjREM"}'::jsonb,
    body:=concat('{"time": "', now(), '"}')::jsonb
  ) as request_id;
  $$
);