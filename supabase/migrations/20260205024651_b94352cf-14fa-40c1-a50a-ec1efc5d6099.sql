-- Fix 1: Explicitly deny unauthenticated access to users table
CREATE POLICY "Deny unauthenticated access to users" 
ON public.users 
FOR SELECT 
TO anon 
USING (false);

-- Fix 2: Explicitly deny unauthenticated access to delivery_requests table
CREATE POLICY "Deny unauthenticated access to delivery_requests" 
ON public.delivery_requests 
FOR SELECT 
TO anon 
USING (false);

-- Fix 3: Ensure clients table also denies unauthenticated access
CREATE POLICY "Deny unauthenticated access to clients" 
ON public.clients 
FOR SELECT 
TO anon 
USING (false);

-- Fix 4: Ensure drivers table also denies unauthenticated access  
CREATE POLICY "Deny unauthenticated access to drivers" 
ON public.drivers 
FOR SELECT 
TO anon 
USING (false);