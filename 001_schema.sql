-- Datezy initial migration. Run once in a NEW Supabase project as postgres.
begin;
create extension if not exists pgcrypto with schema extensions;

create table public.site_settings (
 id integer primary key default 1 check(id=1), site_name text not null default 'Datezy',
 logo_url text not null default '', fees_enabled boolean not null default true,
 male_fee integer not null default 299 check(male_fee between 0 and 100000),
 female_fee integer not null default 299 check(female_fee between 0 and 100000),
 referral_reward integer not null default 200 check(referral_reward between 0 and 100000),
 support_contact text not null default '',
 payment_methods jsonb not null default '[]' check(jsonb_typeof(payment_methods)='array'),
 payment_instructions text not null default 'Payment methods have not been configured. Do not send money until official instructions are available.',
 terms text not null default '', privacy text not null default '', community text not null default '',
 refund_policy text not null default 'Payment and refund terms must be published by the operator before fees are collected. Do not pay while this notice is displayed.',
 referral_terms text not null default 'Rewards are not guaranteed. Only new, eligible, approved accounts with verified required payment and a completed fraud review qualify. Self-referrals and duplicate claims are prohibited. Payouts require admin approval and a recorded payout reference.',
 approval_requirements text not null default '18+, respectful bio, listing consent, verified required payment, and manual profile review.',
 updated_at timestamptz not null default now()
);
insert into public.site_settings(id) values(1);
create table public.user_roles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null check(role in ('admin','user')) default 'user', created_at timestamptz not null default now()
);
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null check(length(full_name) between 2 and 100),
 email text not null, phone text not null unique check(phone ~ '^\+8801[3-9][0-9]{8}$'),
 birth_date date not null, gender text not null check(gender in ('male','female')),
 display_name text not null check(length(display_name) between 2 and 50),
 preferred_gender text not null check(preferred_gender in ('male','female','any')),
 district text not null check(length(district) between 2 and 80), area text not null default '' check(length(area)<=100),
 bio text not null default '' check(length(bio)<=500), interests text[] not null default '{}' check(cardinality(interests)<=12),
 photo_path text, duration integer not null default 60 check(duration in (30,60,90,120)),
 location_type text not null default 'Cafe' check(location_type in ('Cafe','Restaurant','Public park','Museum','Other public place')),
 listing_consent boolean not null default false,
 terms_accepted_at timestamptz not null, adult_confirmed_at timestamptz not null,
 status text not null default 'pending' check(status in ('pending','approved','rejected','suspended')),
 required_fee integer not null check(required_fee>=0),
 referral_code text not null unique default upper(encode(extensions.gen_random_bytes(6),'hex')),
 deletion_requested_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index profiles_email_ci on public.profiles(lower(email));
create index profiles_review_idx on public.profiles(status,created_at desc);
-- A separate projection is intentional: RLS filters ROWS, not private COLUMNS.
create table public.public_profiles (
 id uuid primary key references public.profiles(id) on delete cascade,
 display_name text not null, age integer not null check(age>=18), gender text not null,
 district text not null, bio text not null, interests text[] not null,
 photo_path text, duration integer not null, location_type text not null,
 approved boolean not null default true, updated_at timestamptz not null default now()
);
create index public_profiles_discovery_idx on public.public_profiles(district,gender,age);
create index public_profiles_interests_idx on public.public_profiles using gin(interests);
create table public.payments (
 id uuid primary key default extensions.gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 amount integer not null check(amount>=0), method text not null, transaction_id text not null check(length(transaction_id) between 5 and 100),
 status text not null default 'pending' check(status in ('pending','verified','rejected','refunded')),
 review_note text not null default '', reviewed_by uuid references auth.users(id) on delete set null,
 reviewed_at timestamptz, refund_amount integer not null default 0 check(refund_amount>=0),
 refund_reference text, created_at timestamptz not null default now(),
 unique(method,transaction_id), check(refund_amount<=amount)
);
create unique index one_pending_payment on public.payments(user_id) where status='pending';
create index payments_review_idx on public.payments(status,created_at desc);
create table public.referrals (
 id uuid primary key default extensions.gen_random_uuid(), referrer_id uuid references public.profiles(id) on delete set null,
 referred_id uuid not null unique references public.profiles(id) on delete cascade,
 created_at timestamptz not null default now(), check(referrer_id<>referred_id)
);
create index referrals_owner_idx on public.referrals(referrer_id);
create table public.referral_rewards (
 id uuid primary key default extensions.gen_random_uuid(), referral_id uuid not null unique references public.referrals(id) on delete cascade,
 referrer_id uuid references public.profiles(id) on delete set null,
 amount integer not null check(amount>=0), status text not null default 'pending' check(status in ('pending','approved','paid','rejected')),
 fraud_checked boolean not null default false, review_note text not null default '',
 payout_reference text, reviewed_by uuid references auth.users(id) on delete set null,
 reviewed_at timestamptz, paid_at timestamptz, created_at timestamptz not null default now(),
 check(status<>'paid' or (paid_at is not null and length(payout_reference)>=5))
);
create index referral_rewards_owner_idx on public.referral_rewards(referrer_id,status);
create table public.blocks (
 blocker_id uuid not null references public.profiles(id) on delete cascade,
 blocked_id uuid not null references public.profiles(id) on delete cascade,
 created_at timestamptz not null default now(), primary key(blocker_id,blocked_id), check(blocker_id<>blocked_id)
);
create table public.date_requests (
 id uuid primary key default extensions.gen_random_uuid(), sender_id uuid not null references public.profiles(id) on delete cascade,
 recipient_id uuid not null references public.profiles(id) on delete cascade,
 meeting_date date not null, duration integer not null check(duration in (30,60,90,120)),
 location_type text not null check(location_type in ('Cafe','Restaurant','Public park','Museum','Other public place')),
 activity text not null check(length(activity) between 2 and 150), availability text not null check(length(availability) between 2 and 150),
 status text not null default 'pending' check(status in ('pending','accepted','declined','cancelled')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), check(sender_id<>recipient_id)
);
create index date_requests_recipient_idx on public.date_requests(recipient_id,status);
create index date_requests_sender_idx on public.date_requests(sender_id,created_at desc);
create table public.reports (
 id uuid primary key default extensions.gen_random_uuid(), reporter_id uuid references public.profiles(id) on delete set null,
 reported_id uuid references public.profiles(id) on delete set null,
 reason text not null check(length(reason) between 5 and 1000), status text not null default 'open' check(status in ('open','resolved')),
 admin_note text not null default '', created_at timestamptz not null default now(), resolved_at timestamptz,
 check(reporter_id<>reported_id)
);
create table public.deletion_requests (
 id uuid primary key default extensions.gen_random_uuid(), user_id uuid unique references public.profiles(id) on delete set null,
 status text not null default 'pending' check(status in ('pending','completed')),
 created_at timestamptz not null default now(), completed_at timestamptz
);
create table public.admin_activity (
 id uuid primary key default extensions.gen_random_uuid(), admin_id uuid references auth.users(id) on delete set null,
 action text not null, target_id uuid, details jsonb not null default '{}', created_at timestamptz not null default now()
);
create table public.rate_limits (
 user_id uuid references auth.users(id) on delete cascade, action text not null, bucket timestamptz not null,
 hits integer not null default 1, primary key(user_id,action,bucket)
);

-- All eligibility and meeting calendar boundaries use Bangladesh local dates.
create function public.bd_today() returns date language sql stable set search_path='' as $$
 select (now() at time zone 'Asia/Dhaka')::date;
$$;
create function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.user_roles where user_id=auth.uid() and role='admin');
$$;
create function public.is_active_adult(uid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=uid and birth_date <= (public.bd_today() - interval '18 years')::date
 and status='approved' and deletion_requested_at is null);
$$;
create function public.has_paid(uid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles p where p.id=uid and (p.required_fee=0 or exists(
 select 1 from public.payments t where t.user_id=uid and t.status='verified' and t.amount>=p.required_fee)));
$$;
create function public.assert_admin() returns void language plpgsql security definer set search_path='' as $$
 begin if not public.is_admin() then raise exception 'Admin role required.'; end if; end;
$$;
create function public.rate_check(a text, lim integer) returns void language plpgsql security definer set search_path='' as $$
 declare n integer; begin
 if auth.uid() is null then raise exception 'Please log in.'; end if;
 insert into public.rate_limits(user_id,action,bucket) values(auth.uid(),a,date_trunc('hour',now()))
 on conflict(user_id,action,bucket) do update set hits=public.rate_limits.hits+1 returning hits into n;
 if n>lim then raise exception 'Too many requests. Try again in an hour.'; end if;
 end;
$$;
create function public.log_admin(a text, target uuid, d jsonb default '{}') returns void language sql security definer set search_path='' as $$
 insert into public.admin_activity(admin_id,action,target_id,details) values(auth.uid(),a,target,d);
$$;

-- Server-enforced validation even if the frontend is bypassed.
create function public.validate_profile() returns trigger language plpgsql security definer set search_path='' as $$
 begin
 if new.birth_date > (public.bd_today() - interval '18 years')::date or new.birth_date < public.bd_today() - interval '120 years' then
 raise exception 'Datezy is for adults aged 18 and above.'; end if;
 if new.email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Invalid email.'; end if;
 if exists(select 1 from unnest(new.interests) x where length(x)>40 or length(x)=0) then raise exception 'Invalid interests.'; end if;
 if new.photo_path is not null and (new.photo_path not like new.id::text || '/%' or new.photo_path like '%..%') then
 raise exception 'Photo must belong to this account.'; end if;
 -- Approved content is re-reviewed after any public-facing edit. Paid status is separate.
 if tg_op='UPDATE' and auth.uid()=new.id and not public.is_admin() then perform public.rate_check('profile_edit',30); end if;
 if tg_op='UPDATE' and (new.display_name,new.preferred_gender,new.district,new.area,new.bio,new.interests,new.photo_path,new.duration,new.location_type)
 is distinct from (old.display_name,old.preferred_gender,old.district,old.area,old.bio,old.interests,old.photo_path,old.duration,old.location_type)
 and old.status<>'suspended' then new.status:='pending'; end if;
 new.updated_at:=now(); return new;
 end;
$$;
create trigger profile_validate before insert or update on public.profiles for each row execute function public.validate_profile();
create function public.sync_public_profile() returns trigger language plpgsql security definer set search_path='' as $$
 begin
 if new.status='approved' and new.listing_consent and new.deletion_requested_at is null and public.has_paid(new.id) then
 insert into public.public_profiles(id,display_name,age,gender,district,bio,interests,photo_path,duration,location_type)
 values(new.id,new.display_name,extract(year from age(public.bd_today(),new.birth_date))::int,new.gender,new.district,new.bio,new.interests,new.photo_path,new.duration,new.location_type)
 on conflict(id) do update set display_name=excluded.display_name,age=excluded.age,gender=excluded.gender,district=excluded.district,
 bio=excluded.bio,interests=excluded.interests,photo_path=excluded.photo_path,duration=excluded.duration,location_type=excluded.location_type,updated_at=now();
 else delete from public.public_profiles where id=new.id; end if; return new;
 end;
$$;
create trigger profile_projection after insert or update on public.profiles for each row execute function public.sync_public_profile();

create function public.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$
 declare m jsonb:=new.raw_user_meta_data; fee integer; owner_id uuid; rid uuid; s public.site_settings;
 begin
 if coalesce((m->>'terms_accepted')::boolean,false)=false or coalesce((m->>'adult_confirmed')::boolean,false)=false then
 raise exception 'Terms acceptance and adult confirmation are required.'; end if;
 select * into s from public.site_settings where id=1;
 fee:=case when not s.fees_enabled then 0 when m->>'gender'='male' then s.male_fee else s.female_fee end;
 insert into public.profiles(id,full_name,email,phone,birth_date,gender,display_name,preferred_gender,district,area,bio,interests,duration,location_type,listing_consent,terms_accepted_at,adult_confirmed_at,required_fee)
 values(new.id,m->>'full_name',lower(new.email),m->>'phone',(m->>'birth_date')::date,m->>'gender',m->>'display_name',m->>'preferred_gender',m->>'district',coalesce(m->>'area',''),coalesce(m->>'bio',''),
 array(select jsonb_array_elements_text(coalesce(m->'interests','[]'))),coalesce((m->>'duration')::int,60),coalesce(m->>'location_type','Cafe'),coalesce((m->>'listing_consent')::boolean,false),now(),now(),fee);
 insert into public.user_roles(user_id,role) values(new.id,'user');
 if nullif(trim(m->>'referral_code'),'') is not null then
 select id into owner_id from public.profiles where referral_code=upper(trim(m->>'referral_code')) and status<>'suspended' and deletion_requested_at is null;
 if owner_id is null or owner_id=new.id then raise exception 'Invalid referral code.'; end if;
 insert into public.referrals(referrer_id,referred_id) values(owner_id,new.id) returning id into rid;
 insert into public.referral_rewards(referral_id,referrer_id,amount) values(rid,owner_id,s.referral_reward);
 end if;
 return new;
 end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create function public.submit_payment(p_method text,p_transaction text) returns uuid language plpgsql security definer set search_path='' as $$
 declare p public.profiles; result uuid; begin
 perform public.rate_check('payment',5);
 select * into p from public.profiles where id=auth.uid() for update;
 if p.id is null or p.status='suspended' or p.deletion_requested_at is not null then raise exception 'Account unavailable.'; end if;
 if p.required_fee=0 or public.has_paid(p.id) then raise exception 'No payment is currently required.'; end if;
 if not exists(select 1 from public.site_settings s, jsonb_array_elements(s.payment_methods) m where s.id=1 and m->>'name'=p_method and coalesce((m->>'enabled')::boolean,false)) then
 raise exception 'Payment method is unavailable.'; end if;
 if exists(select 1 from public.site_settings where id=1 and (length(trim(refund_policy))<40 or refund_policy like 'Payment and refund terms must%')) then
 raise exception 'The operator must publish payment and refund policies first.'; end if;
 insert into public.payments(user_id,amount,method,transaction_id) values(p.id,p.required_fee,p_method,upper(trim(p_transaction))) returning id into result;
 return result;
 end;
$$;
create function public.admin_review_payment(p_id uuid,p_action text,p_note text default '',p_refund_amount integer default 0,p_refund_reference text default '') returns void language plpgsql security definer set search_path='' as $$
 declare pay public.payments; begin
 perform public.assert_admin();
 select * into pay from public.payments where id=p_id for update;
 if not found then raise exception 'Payment not found.'; end if;
 if p_action in ('verified','rejected') and pay.status='pending' then
 update public.payments set status=p_action,review_note=left(p_note,1000),reviewed_by=auth.uid(),reviewed_at=now() where id=p_id;
 elsif p_action='refunded' and pay.status='verified' and p_refund_amount between 1 and pay.amount and length(trim(p_refund_reference))>=5 then
 update public.payments set status='refunded',refund_amount=p_refund_amount,refund_reference=trim(p_refund_reference),review_note=left(p_note,1000),reviewed_by=auth.uid(),reviewed_at=now() where id=p_id;
 update public.profiles set status='pending' where id=pay.user_id;
 update public.referral_rewards rr set status='rejected',review_note='Required payment refunded.' from public.referrals r where r.id=rr.referral_id and r.referred_id=pay.user_id and rr.status<>'paid';
 else raise exception 'Invalid payment transition or refund details.'; end if;
 perform public.log_admin('payment.'||p_action,p_id,jsonb_build_object('note',left(p_note,1000),'refund_amount',p_refund_amount));
 end;
$$;
create function public.admin_review_profile(p_id uuid,p_status text,p_note text default '') returns void language plpgsql security definer set search_path='' as $$
 declare p public.profiles; begin
 perform public.assert_admin(); select * into p from public.profiles where id=p_id for update;
 if not found then raise exception 'Profile not found.'; end if;
 if p_status not in ('pending','approved','rejected','suspended') then raise exception 'Invalid status.'; end if;
 if p_status='approved' and (not exists(select 1 from auth.users where id=p_id and email_confirmed_at is not null) or not public.has_paid(p_id) or p.deletion_requested_at is not null or not p.listing_consent) then
 raise exception 'Approval requires confirmed email, verified required payment, public listing consent, and no deletion request.'; end if;
 update public.profiles set status=p_status where id=p_id;
 if p_status in ('rejected','suspended') then
 update public.referral_rewards rr set status='rejected',review_note='Referred account is not eligible.' from public.referrals r where r.id=rr.referral_id and r.referred_id=p_id and rr.status<>'paid'; end if;
 perform public.log_admin('profile.'||p_status,p_id,jsonb_build_object('note',left(p_note,2000)));
 end;
$$;
create function public.admin_add_note(p_id uuid,p_note text) returns void language plpgsql security definer set search_path='' as $$
 begin perform public.assert_admin();
 if not exists(select 1 from public.profiles where id=p_id) or length(trim(p_note))<2 then raise exception 'An existing profile and a note are required.'; end if;
 perform public.log_admin('profile.note',p_id,jsonb_build_object('note',left(p_note,2000)));
 end;
$$;
create function public.admin_review_reward(p_id uuid,p_action text,p_fraud_checked boolean default false,p_note text default '',p_payout_reference text default '') returns void language plpgsql security definer set search_path='' as $$
 declare rw public.referral_rewards; r public.referrals; begin
 perform public.assert_admin(); select * into rw from public.referral_rewards where id=p_id for update;
 if not found then raise exception 'Reward not found.'; end if;
 select * into r from public.referrals where id=rw.referral_id;
 if p_action='approved' and rw.status in ('pending','rejected') then
 if not p_fraud_checked or length(trim(p_note))<5 or not public.is_active_adult(r.referred_id) or not public.has_paid(r.referred_id)
 or r.referrer_id is null or r.referrer_id=r.referred_id or not exists(select 1 from public.profiles where id=r.referrer_id and status<>'suspended' and deletion_requested_at is null) then
 raise exception 'Reward requires an eligible account, verified payment, and a documented fraud review.'; end if;
 update public.referral_rewards set status='approved',fraud_checked=true,review_note=left(p_note,2000),reviewed_by=auth.uid(),reviewed_at=now() where id=p_id;
 elsif p_action='paid' and rw.status='approved' then
 if length(trim(p_payout_reference))<5 or not public.is_active_adult(r.referred_id) or not public.has_paid(r.referred_id)
 or not exists(select 1 from public.profiles where id=rw.referrer_id and status<>'suspended' and deletion_requested_at is null) then
 raise exception 'Payout requires a reference and continued eligibility.'; end if;
 update public.referral_rewards set status='paid',payout_reference=trim(p_payout_reference),paid_at=now(),reviewed_by=auth.uid() where id=p_id;
 elsif p_action='rejected' and rw.status in ('pending','approved') then
 update public.referral_rewards set status='rejected',review_note=left(p_note,2000),reviewed_by=auth.uid(),reviewed_at=now() where id=p_id;
 else raise exception 'Invalid reward transition. Paid rewards cannot be claimed again.'; end if;
 perform public.log_admin('reward.'||p_action,p_id,jsonb_build_object('note',left(p_note,2000),'fraud_checked',p_fraud_checked));
 end;
$$;

create function public.send_date_request(p_recipient uuid,p_date date,p_duration integer,p_location text,p_activity text,p_availability text) returns uuid language plpgsql security definer set search_path='' as $$
 declare result uuid; begin
 perform public.rate_check('date_request',10);
 if not public.is_active_adult(auth.uid()) or not public.is_active_adult(p_recipient) or not public.has_paid(auth.uid()) or not public.has_paid(p_recipient)
 or not exists(select 1 from public.public_profiles where id=p_recipient) then raise exception 'Only approved adults can arrange dates with listed profiles.'; end if;
 if exists(select 1 from public.blocks where (blocker_id=auth.uid() and blocked_id=p_recipient) or (blocker_id=p_recipient and blocked_id=auth.uid())) then raise exception 'This connection is unavailable.'; end if;
 if p_date<public.bd_today() or p_date>public.bd_today()+365 then raise exception 'Choose a date within the next year.'; end if;
 if exists(select 1 from public.date_requests where sender_id=auth.uid() and recipient_id=p_recipient and status='pending') then raise exception 'You already have a pending request for this person.'; end if;
 insert into public.date_requests(sender_id,recipient_id,meeting_date,duration,location_type,activity,availability)
 values(auth.uid(),p_recipient,p_date,p_duration,p_location,trim(p_activity),trim(p_availability)) returning id into result; return result;
 end;
$$;
create function public.respond_date_request(p_id uuid,p_action text) returns void language plpgsql security definer set search_path='' as $$
 declare r public.date_requests; begin
 perform public.rate_check('date_response',30); select * into r from public.date_requests where id=p_id for update;
 if not found then raise exception 'Request not found.'; end if;
 if p_action in ('accepted','declined') and r.recipient_id=auth.uid() and (r.status='pending' or (r.status='accepted' and p_action='declined')) then
 if not public.is_active_adult(auth.uid()) or not public.is_active_adult(r.sender_id) or not public.has_paid(auth.uid()) or not public.has_paid(r.sender_id) or exists(select 1 from public.blocks where (blocker_id=r.sender_id and blocked_id=r.recipient_id) or (blocker_id=r.recipient_id and blocked_id=r.sender_id)) then raise exception 'Connection is no longer available.'; end if;
 elsif p_action='cancelled' and r.sender_id=auth.uid() and r.status in ('pending','accepted') then null;
 else raise exception 'You cannot change this request.'; end if;
 update public.date_requests set status=p_action,updated_at=now() where id=p_id;
 end;
$$;
create function public.block_profile(p_id uuid,p_block boolean default true) returns void language plpgsql security definer set search_path='' as $$
 begin
 perform public.rate_check('block',30);
 if p_id=auth.uid() or not exists(select 1 from public.profiles where id=auth.uid() and status<>'suspended') then raise exception 'Invalid block.'; end if;
 if p_block then insert into public.blocks(blocker_id,blocked_id) values(auth.uid(),p_id) on conflict do nothing;
 update public.date_requests set status='cancelled',updated_at=now() where status in ('pending','accepted') and ((sender_id=auth.uid() and recipient_id=p_id) or (sender_id=p_id and recipient_id=auth.uid()));
 else delete from public.blocks where blocker_id=auth.uid() and blocked_id=p_id; end if;
 end;
$$;
create function public.report_profile(p_id uuid,p_reason text) returns void language plpgsql security definer set search_path='' as $$
 begin perform public.rate_check('report',10);
 if p_id=auth.uid() or not exists(select 1 from public.profiles where id=auth.uid() and status<>'suspended') then raise exception 'Invalid report.'; end if;
 insert into public.reports(reporter_id,reported_id,reason) values(auth.uid(),p_id,trim(p_reason)); end;
$$;
create function public.admin_resolve_report(p_id uuid,p_note text) returns void language plpgsql security definer set search_path='' as $$
 begin perform public.assert_admin();
 update public.reports set status='resolved',admin_note=left(p_note,2000),resolved_at=now() where id=p_id and status='open';
 if not found then raise exception 'Open report not found.'; end if; perform public.log_admin('report.resolved',p_id); end;
$$;
create function public.request_account_deletion() returns void language plpgsql security definer set search_path='' as $$
 begin perform public.rate_check('deletion',3);
 update public.profiles set deletion_requested_at=coalesce(deletion_requested_at,now()),listing_consent=false,status='pending' where id=auth.uid();
 if not found then raise exception 'Account not found.'; end if;
 insert into public.deletion_requests(user_id) values(auth.uid()) on conflict(user_id) do nothing;
 update public.date_requests set status='cancelled',updated_at=now() where status in ('pending','accepted') and (sender_id=auth.uid() or recipient_id=auth.uid());
 update public.referral_rewards rr set status='rejected',review_note='Account deletion requested.' from public.referrals r where r.id=rr.referral_id and (r.referred_id=auth.uid() or r.referrer_id=auth.uid()) and rr.status<>'paid';
 end;
$$;
create function public.admin_update_settings(p_settings jsonb) returns void language plpgsql security definer set search_path='' as $$
 declare item jsonb; begin perform public.assert_admin();
 if length(trim(p_settings->>'site_name')) not between 2 and 50 then raise exception 'Invalid site name.'; end if;
 if jsonb_typeof(p_settings->'payment_methods')<>'array' or jsonb_array_length(p_settings->'payment_methods')>10 then raise exception 'Payment methods must be a JSON array, maximum 10.'; end if;
 for item in select value from jsonb_array_elements(p_settings->'payment_methods') loop
 if length(trim(item->>'name')) not between 2 and 60 or length(trim(item->>'account')) not between 3 and 150 or jsonb_typeof(item->'enabled')<>'boolean' then raise exception 'Each method needs name, account, and boolean enabled.'; end if;
 end loop;
 if exists(select 1 from jsonb_array_elements(p_settings->'payment_methods') m group by m->>'name' having count(*)>1) then raise exception 'Payment method names must be unique.'; end if;
 if exists(select 1 from jsonb_array_elements(p_settings->'payment_methods') m where (m->>'enabled')::boolean) and (coalesce(length(trim(p_settings->>'support_contact')),0)<5 or coalesce(length(trim(p_settings->>'terms')),0)<100 or coalesce(length(trim(p_settings->>'privacy')),0)<100 or coalesce(length(trim(p_settings->>'refund_policy')),0)<40 or p_settings->>'refund_policy' like 'Payment and refund terms must%') then raise exception 'Publish support, terms, privacy, and refund policies before enabling payments.'; end if;
 update public.site_settings set site_name=trim(p_settings->>'site_name'),logo_url=left(coalesce(p_settings->>'logo_url',''),1000),
 fees_enabled=(p_settings->>'fees_enabled')::boolean,male_fee=(p_settings->>'male_fee')::int,female_fee=(p_settings->>'female_fee')::int,
 referral_reward=(p_settings->>'referral_reward')::int,support_contact=left(coalesce(p_settings->>'support_contact',''),200),
 payment_methods=p_settings->'payment_methods',payment_instructions=left(coalesce(p_settings->>'payment_instructions',''),10000),
 terms=left(coalesce(p_settings->>'terms',''),50000),privacy=left(coalesce(p_settings->>'privacy',''),50000),community=left(coalesce(p_settings->>'community',''),30000),
 refund_policy=left(coalesce(p_settings->>'refund_policy',''),10000),referral_terms=left(coalesce(p_settings->>'referral_terms',''),10000),
 approval_requirements=left(coalesce(p_settings->>'approval_requirements',''),10000),updated_at=now() where id=1;
 perform public.log_admin('settings.updated',null);
 end;
$$;

-- Safe discovery includes current age and reciprocal blocks. Never SELECT * from private profiles here.
create function public.discover_profiles(p_gender text default '',p_min_age integer default 18,p_max_age integer default 100,p_district text default '',p_interest text default '',p_duration integer default 0,p_offset integer default 0)
 returns table(id uuid,display_name text,age integer,gender text,district text,bio text,interests text[],photo_path text,duration integer,location_type text,approved boolean)
 language plpgsql stable security definer set search_path='' as $$
 begin
 if not public.is_active_adult(auth.uid()) or not public.has_paid(auth.uid()) then raise exception 'Discovery is available after your profile and required payment are approved.'; end if;
 return query select pp.id,pp.display_name,extract(year from age(public.bd_today(),p.birth_date))::int,pp.gender,pp.district,pp.bio,pp.interests,pp.photo_path,pp.duration,pp.location_type,pp.approved
 from public.public_profiles pp join public.profiles p on p.id=pp.id
 where pp.id<>auth.uid() and p.status='approved' and p.listing_consent and p.deletion_requested_at is null and public.has_paid(p.id)
 and (p_gender='' or pp.gender=p_gender) and extract(year from age(public.bd_today(),p.birth_date)) between greatest(18,p_min_age) and least(120,p_max_age)
 and (p_district='' or pp.district ilike '%'||p_district||'%') and (p_interest='' or exists(select 1 from unnest(pp.interests) x where x ilike '%'||p_interest||'%'))
 and (p_duration=0 or pp.duration=p_duration)
 and not exists(select 1 from public.blocks b where (b.blocker_id=auth.uid() and b.blocked_id=pp.id) or (b.blocker_id=pp.id and b.blocked_id=auth.uid()))
 order by pp.updated_at desc,pp.id limit 24 offset greatest(0,least(p_offset,10000));
 end;
$$;

-- Keep the private email snapshot consistent when Supabase finalizes an email change.
create function public.sync_auth_email() returns trigger language plpgsql security definer set search_path='' as $$
 begin if new.email is distinct from old.email and new.email is not null then
 update public.profiles set email=lower(new.email) where id=new.id;
 end if; return new; end;
$$;
create trigger on_auth_email_changed after update of email on auth.users for each row execute function public.sync_auth_email();

create function public.mark_deleted_account() returns trigger language plpgsql security definer set search_path='' as $$
 begin update public.deletion_requests set status='completed',completed_at=now() where user_id=old.id; return old; end;
$$;
create trigger on_auth_user_deleted before delete on auth.users for each row execute function public.mark_deleted_account();

-- Explicit table privileges: no client can write financial/moderation/role state.
alter table public.site_settings enable row level security;
alter table public.user_roles enable row level security;
alter table public.profiles enable row level security;
alter table public.public_profiles enable row level security;
alter table public.payments enable row level security;
alter table public.referrals enable row level security;
alter table public.referral_rewards enable row level security;
alter table public.blocks enable row level security;
alter table public.date_requests enable row level security;
alter table public.reports enable row level security;
alter table public.deletion_requests enable row level security;
alter table public.admin_activity enable row level security;
alter table public.rate_limits enable row level security;
revoke all on public.site_settings,public.user_roles,public.profiles,public.public_profiles,public.payments,public.referrals,public.referral_rewards,public.blocks,public.date_requests,public.reports,public.deletion_requests,public.admin_activity,public.rate_limits from anon,authenticated;
grant select on public.site_settings,public.public_profiles to anon,authenticated;
grant select on public.user_roles,public.profiles,public.payments,public.referrals,public.referral_rewards,public.blocks,public.date_requests,public.reports,public.deletion_requests,public.admin_activity to authenticated;
grant update(display_name,preferred_gender,district,area,bio,interests,photo_path,duration,location_type,listing_consent) on public.profiles to authenticated;
create policy settings_read on public.site_settings for select to anon,authenticated using(true);
create policy own_roles on public.user_roles for select to authenticated using(user_id=auth.uid() or public.is_admin());
create policy private_profiles_read on public.profiles for select to authenticated using(id=auth.uid() or public.is_admin());
create policy private_profiles_update on public.profiles for update to authenticated using(id=auth.uid() and status<>'suspended' and deletion_requested_at is null) with check(id=auth.uid());
create policy public_safe_read on public.public_profiles for select to anon,authenticated using(
 exists(select 1 from public.profiles p where p.id=public_profiles.id and p.status='approved' and p.listing_consent and p.deletion_requested_at is null)
);
-- Above subquery would inherit private-profile RLS for anon. Use SECURITY DEFINER predicate instead.
create function public.is_listed(uid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=uid and status='approved' and listing_consent and deletion_requested_at is null) and public.has_paid(uid);
$$;
drop policy public_safe_read on public.public_profiles;
create policy public_safe_read on public.public_profiles for select to anon,authenticated using(public.is_listed(id));
create policy own_payments on public.payments for select to authenticated using(user_id=auth.uid() or public.is_admin());
-- Referrers cannot access referred users' identity; they read only rewards with opaque referral IDs.
create policy referral_read on public.referrals for select to authenticated using(referred_id=auth.uid() or public.is_admin());
create policy reward_read on public.referral_rewards for select to authenticated using(referrer_id=auth.uid() or public.is_admin());
create policy own_blocks on public.blocks for select to authenticated using(blocker_id=auth.uid() or public.is_admin());
create policy own_dates on public.date_requests for select to authenticated using(sender_id=auth.uid() or recipient_id=auth.uid() or public.is_admin());
create policy own_reports on public.reports for select to authenticated using(reporter_id=auth.uid() or public.is_admin());
create policy own_deletion on public.deletion_requests for select to authenticated using(user_id=auth.uid() or public.is_admin());
create policy admin_audit on public.admin_activity for select to authenticated using(public.is_admin());
-- rate_limits has no direct client policies or grants.

-- Functions default to PUBLIC EXECUTE in PostgreSQL; revoke ALL explicitly.
revoke execute on all functions in schema public from public,anon,authenticated;
grant execute on function public.is_admin(),public.is_listed(uuid) to anon,authenticated;
grant execute on function public.submit_payment(text,text),public.send_date_request(uuid,date,integer,text,text,text),public.respond_date_request(uuid,text),public.block_profile(uuid,boolean),public.report_profile(uuid,text),public.request_account_deletion() to authenticated;
grant execute on function public.admin_review_profile(uuid,text,text),public.admin_review_payment(uuid,text,text,integer,text),public.admin_review_reward(uuid,text,boolean,text,text),public.admin_resolve_report(uuid,text),public.admin_update_settings(jsonb),public.admin_add_note(uuid,text),public.discover_profiles(text,integer,integer,text,text,integer,integer) to authenticated;

-- Private photo bucket. Approved+consented photos receive short-lived signed URLs;
-- their storage paths contain only random IDs, not names or phone numbers.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('profile-photos','profile-photos',false,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy photo_upload on storage.objects for insert to authenticated with check(bucket_id='profile-photos' and (storage.foldername(name))[1]=auth.uid()::text and exists(select 1 from public.profiles where id=auth.uid() and status<>'suspended' and deletion_requested_at is null));
create policy photo_read on storage.objects for select to anon,authenticated using(bucket_id='profile-photos' and (
 (storage.foldername(name))[1]=auth.uid()::text or public.is_admin() or exists(select 1 from public.public_profiles pp where pp.photo_path=name and public.is_listed(pp.id))));
create policy photo_delete on storage.objects for delete to authenticated using(bucket_id='profile-photos' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_admin()));
commit;
