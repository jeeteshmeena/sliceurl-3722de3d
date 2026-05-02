-- Backfill city for clicks where city was 'Unknown' but IP is geolocatable
UPDATE public.clicks SET city = 'Indore' WHERE ip_address = '152.56.180.159' AND (city = 'Unknown' OR city IS NULL);
UPDATE public.clicks SET city = 'Lowada' WHERE ip_address = '223.237.66.227' AND (city = 'Unknown' OR city IS NULL);
UPDATE public.clicks SET city = 'Ambala' WHERE ip_address = '110.224.78.159' AND (city = 'Unknown' OR city IS NULL);
UPDATE public.clicks SET city = 'Jaipur' WHERE ip_address = '47.15.83.193' AND (city = 'Unknown' OR city IS NULL);
UPDATE public.clicks SET city = 'Mumbai' WHERE ip_address = '106.192.50.90' AND (city = 'Unknown' OR city IS NULL);
UPDATE public.clicks SET city = 'Imphal' WHERE ip_address = '49.47.135.225' AND (city = 'Unknown' OR city IS NULL);
UPDATE public.clicks SET city = 'Pune' WHERE ip_address = '157.32.201.170' AND (city = 'Unknown' OR city IS NULL);