-- Seed sample data: 10 sample lawyers for local testing
-- auth.users mock inserts would normally be done via the Auth API, 
-- but for local dev we can insert them into public.lawyers directly 
-- assuming foreign key checks on auth.users are relaxed or we insert there first.
-- Here we'll generate UUIDs for the auth.users and insert them into auth.users first.

-- Insert 10 auth users (mock for lawyers)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'lawyer1@nyayasatya.in', 'password123', NOW(), '{"role":"lawyer"}'),
    ('22222222-2222-2222-2222-222222222222', 'lawyer2@nyayasatya.in', 'password123', NOW(), '{"role":"lawyer"}'),
    ('33333333-3333-3333-3333-333333333333', 'lawyer3@nyayasatya.in', 'password123', NOW(), '{"role":"lawyer"}'),
    ('44444444-4444-4444-4444-444444444444', 'lawyer4@nyayasatya.in', 'password123', NOW(), '{"role":"lawyer"}'),
    ('55555555-5555-5555-5555-555555555555', 'lawyer5@nyayasatya.in', 'password123', NOW(), '{"role":"lawyer"}'),
    ('66666666-6666-6666-6666-666666666666', 'lawyer6@nyayasatya.in', 'password123', NOW(), '{"role":"lawyer"}'),
    ('77777777-7777-7777-7777-777777777777', 'lawyer7@nyayasatya.in', 'password123', NOW(), '{"role":"lawyer"}'),
    ('88888888-8888-8888-8888-888888888888', 'lawyer8@nyayasatya.in', 'password123', NOW(), '{"role":"lawyer"}'),
    ('99999999-9999-9999-9999-999999999999', 'lawyer9@nyayasatya.in', 'password123', NOW(), '{"role":"lawyer"}'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'lawyer10@nyayasatya.in', 'password123', NOW(), '{"role":"lawyer"}')
ON CONFLICT (id) DO NOTHING;

-- Insert 10 verified lawyers
INSERT INTO public.lawyers (
    auth_id, full_name, email, phone, city, state, pincode, 
    bar_enrollment_number, state_bar_council, enrollment_year,
    specialisations, court_jurisdictions, experience_years, languages,
    fee_per_hour_inr, is_verified, verification_status
) VALUES 
('11111111-1111-1111-1111-111111111111', 'Amit Sharma', 'lawyer1@nyayasatya.in', '+919876543210', 'Mumbai', 'Maharashtra', '400001', 'MH/2010/1234', 'Bar Council of Maharashtra & Goa', 2010, '{"civil", "family"}', '{"Bombay High Court"}', 14, '{"en", "mr", "hi"}', 2000, true, 'verified'),
('22222222-2222-2222-2222-222222222222', 'Priya Desai', 'lawyer2@nyayasatya.in', '+919876543211', 'Pune', 'Maharashtra', '411001', 'MH/2015/5678', 'Bar Council of Maharashtra & Goa', 2015, '{"corporate", "property"}', '{"Pune District Court"}', 9, '{"en", "mr"}', 3000, true, 'verified'),
('33333333-3333-3333-3333-333333333333', 'Ravi Kumar', 'lawyer3@nyayasatya.in', '+919876543212', 'Delhi', 'Delhi', '110001', 'DL/2005/4321', 'Bar Council of Delhi', 2005, '{"criminal"}', '{"Supreme Court of India", "Delhi High Court"}', 19, '{"en", "hi"}', 5000, true, 'verified'),
('44444444-4444-4444-4444-444444444444', 'Anjali Gupta', 'lawyer4@nyayasatya.in', '+919876543213', 'Delhi', 'Delhi', '110002', 'DL/2018/8765', 'Bar Council of Delhi', 2018, '{"taxation", "corporate"}', '{"Delhi High Court"}', 6, '{"en", "hi"}', 1500, true, 'verified'),
('55555555-5555-5555-5555-555555555555', 'Karthik Iyer', 'lawyer5@nyayasatya.in', '+919876543214', 'Chennai', 'Tamil Nadu', '600001', 'TN/2012/1122', 'Bar Council of Tamil Nadu', 2012, '{"ip", "cyber"}', '{"Madras High Court"}', 12, '{"en", "ta"}', 4000, true, 'verified'),
('66666666-6666-6666-6666-666666666666', 'Meena Rajan', 'lawyer6@nyayasatya.in', '+919876543215', 'Bengaluru', 'Karnataka', '560001', 'KA/2019/3344', 'Bar Council of Karnataka', 2019, '{"labour", "civil"}', '{"Karnataka High Court"}', 5, '{"en", "kn", "hi"}', 1000, true, 'verified'),
('77777777-7777-7777-7777-777777777777', 'Suresh Reddy', 'lawyer7@nyayasatya.in', '+919876543216', 'Hyderabad', 'Telangana', '500001', 'TS/2008/5566', 'Bar Council of Telangana', 2008, '{"property", "family"}', '{"Telangana High Court"}', 16, '{"en", "te", "hi"}', 2500, true, 'verified'),
('88888888-8888-8888-8888-888888888888', 'Vikram Singh', 'lawyer8@nyayasatya.in', '+919876543217', 'Jaipur', 'Rajasthan', '302001', 'RJ/2021/7788', 'Bar Council of Rajasthan', 2021, '{"criminal", "consumer"}', '{"Rajasthan High Court"}', 3, '{"en", "hi"}', 800, true, 'verified'),
('99999999-9999-9999-9999-999999999999', 'Neha Patel', 'lawyer9@nyayasatya.in', '+919876543218', 'Ahmedabad', 'Gujarat', '380001', 'GJ/2014/9900', 'Bar Council of Gujarat', 2014, '{"corporate", "civil"}', '{"Gujarat High Court"}', 10, '{"en", "gu"}', 2000, true, 'verified'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Arjun Kapoor', 'lawyer10@nyayasatya.in', '+919876543219', 'Lucknow', 'Uttar Pradesh', '226001', 'UP/2017/2468', 'Bar Council of Uttar Pradesh', 2017, '{"constitutional", "criminal"}', '{"Allahabad High Court"}', 7, '{"en", "hi"}', 1200, true, 'verified')
ON CONFLICT (auth_id) DO NOTHING;
