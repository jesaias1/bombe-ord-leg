-- Find the user ID for sunglazzez@gmail.com and add admin role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users 
WHERE email = 'sunglazzez@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;