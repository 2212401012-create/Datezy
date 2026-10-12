// Local PostgreSQL behavioral tests. Mock Auth/Storage replace managed Supabase
// services; test-only RNG shims are NEVER used by the shipped migration.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
test('SQL migration, RLS, approvals, refunds, and referral state machines', async () => {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create schema auth; create schema storage; create schema extensions;
 create table auth.users(id uuid primary key,email text unique,raw_user_meta_data jsonb default '{}',email_confirmed_at timestamptz);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;
 create function extensions.gen_random_uuid() returns uuid language sql volatile as $$select gen_random_uuid()$$;
 create function extensions.gen_random_bytes(n integer) returns bytea language sql volatile as $$select decode(substr(repeat(md5(random()::text),10),1,n*2),'hex')$$;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;
 grant usage on schema storage to anon,authenticated;grant select,insert,delete on storage.objects to anon,authenticated;
 create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;`);
  const sql = readFileSync(
    new URL('../supabase/001_schema.sql', import.meta.url),
    'utf8',
  ).replace(
    'create extension if not exists pgcrypto with schema extensions;',
    '-- pgcrypto mocked above ONLY for local tests',
  );
  await db.exec(sql);
  const ids = {
    admin: '11111111-1111-4111-8111-111111111111',
    a: '22222222-2222-4222-8222-222222222222',
    b: '33333333-3333-4333-8333-333333333333',
    minor: '44444444-4444-4444-8444-444444444444',
  };
  async function as(id, role = 'authenticated') {
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      id || '',
    ]);
    await db.exec(`set role ${role}`);
  }
  async function root() {
    await as('', 'postgres');
  }
  async function add(id, email, phone, extras = {}) {
    await root();
    const m = {
      full_name: 'Test Adult',
      display_name: 'QA adult',
      phone,
      birth_date: '1998-01-01',
      gender: 'male',
      preferred_gender: 'any',
      district: 'Dhaka',
      terms_accepted: true,
      adult_confirmed: true,
      listing_consent: true,
      bio: 'QA-only data',
      ...extras,
    };
    await db.query(
      'insert into auth.users(id,email,raw_user_meta_data,email_confirmed_at) values($1,$2,$3,now())',
      [id, email, JSON.stringify(m)],
    );
  }
  await assert.rejects(
    () =>
      add(ids.minor, 'minor@test.invalid', '+8801712345670', {
        birth_date: '2020-01-01',
      }),
    /18/,
  );
  await add(ids.admin, 'admin@test.invalid', '+8801712345671');
  await db.query("update public.user_roles set role='admin' where user_id=$1", [
    ids.admin,
  ]);
  await add(ids.a, 'adult1@test.invalid', '+8801712345672');
  const code = (
    await db.query('select referral_code from public.profiles where id=$1', [
      ids.a,
    ])
  ).rows[0].referral_code;
  await add(ids.b, 'adult2@test.invalid', '+8801712345673', {
    referral_code: code,
  });
  await assert.rejects(
    () => add(ids.minor, 'duplicate@test.invalid', '+8801712345672'),
    /unique|duplicate/,
  );
  await as(ids.a);
  assert.equal(
    (await db.query('select * from public.profiles')).rows.length,
    1,
    'a cannot read b private info',
  );
  await assert.rejects(
    () =>
      db.query("update public.profiles set status='approved' where id=$1", [
        ids.a,
      ]),
    /permission denied/,
  );
  await assert.rejects(
    () =>
      db.query("update public.user_roles set role='admin' where user_id=$1", [
        ids.a,
      ]),
    /permission denied/,
  );
  await assert.rejects(
    () =>
      db.query("select public.admin_review_profile($1,'approved','abuse')", [
        ids.a,
      ]),
    /Admin role/,
  );
  await assert.rejects(
    () => db.query("select public.rate_check('bypass',1000)"),
    /permission denied/,
  );
  await assert.rejects(
    () => db.query("select public.admin_add_note($1,'not permitted')", [ids.a]),
    /Admin role/,
  );
  assert.equal(
    (await db.query('select * from public.admin_activity')).rows.length,
    0,
  );
  await assert.rejects(
    () => db.query('select public.discover_profiles()'),
    /approved/,
  );
  await as(ids.admin);
  await assert.rejects(
    () =>
      db.query("select public.admin_review_profile($1,'approved','review')", [
        ids.a,
      ]),
    /verified required payment/,
  );
  await db.query(
    "select public.admin_add_note($1,'Admin-only moderation detail')",
    [ids.a],
  );
  assert.equal(
    (
      await db.query(
        "select * from public.admin_activity where action='profile.note'",
      )
    ).rows.length,
    1,
  );
  // Configure methods as migration owner for fixtures; production uses protected RPC.
  await root();
  await db.exec(
    `update public.site_settings set support_contact='support@test.invalid',refund_policy='QA refund terms: requests reviewed and refundable amounts documented.',payment_methods='[{"name":"QA method","account":"QA-account","enabled":true}]';`,
  );
  async function pay(id, reference) {
    await as(id);
    return (
      await db.query('select public.submit_payment($1,$2) as id', [
        'QA method',
        reference,
      ])
    ).rows[0].id;
  }
  const pa = await pay(ids.a, 'TX-ADULT-A');
  const pb = await pay(ids.b, 'TX-ADULT-B');
  assert.equal(
    (await db.query('select status from public.payments')).rows[0].status,
    'pending',
    'reference alone is not success',
  );
  await assert.rejects(
    () => db.query("update public.payments set status='verified'"),
    /permission denied/,
  );
  await assert.rejects(() => pay(ids.b, 'TX-ADULT-A'), /unique|duplicate/);
  await as(ids.admin);
  for (const [id, p] of [
    [ids.a, pa],
    [ids.b, pb],
  ]) {
    await db.query(
      "select public.admin_review_payment($1,'verified','Independent verification')",
      [p],
    );
    await db.query(
      "select public.admin_review_profile($1,'approved','Profile reviewed')",
      [id],
    );
  }
  const rw = (await db.query('select id from public.referral_rewards')).rows[0]
    .id;
  await assert.rejects(
    () =>
      db.query(
        "select public.admin_review_reward($1,'approved',false,'unchecked','')",
        [rw],
      ),
    /fraud/,
  );
  await db.query(
    "select public.admin_review_reward($1,'approved',true,'Unique contact and signup patterns checked','')",
    [rw],
  );
  await db.query(
    "select public.admin_review_reward($1,'paid',false,'','PAYOUT-001')",
    [rw],
  );
  await assert.rejects(
    () =>
      db.query(
        "select public.admin_review_reward($1,'paid',false,'','PAYOUT-002')",
        [rw],
      ),
    /Invalid reward transition/,
  );
  await as(null, 'anon');
  const pub = (await db.query('select * from public.public_profiles')).rows;
  assert.equal(pub.length, 2);
  for (const p of pub)
    for (const field of [
      'email',
      'phone',
      'birth_date',
      'transaction_id',
      'referral_code',
      'moderation_note',
    ])
      assert.equal(field in p, false);
  await assert.rejects(
    () => db.query('select * from public.profiles'),
    /permission denied/,
  );
  await as(ids.a);
  assert.equal(
    (await db.query('select * from public.referrals')).rows.length,
    0,
    'referrer cannot see referred identity',
  );
  assert.equal(
    (await db.query('select * from public.referral_rewards')).rows.length,
    1,
  );
  await assert.rejects(
    () => db.query("update public.referral_rewards set status='paid'"),
    /permission denied/,
  );
  assert.equal(
    (await db.query('select * from public.discover_profiles()')).rows.length,
    1,
  );
  const req = (
    await db.query(
      "select public.send_date_request($1,(now() at time zone 'Asia/Dhaka')::date,60,'Cafe','Coffee','4 PM') as id",
      [ids.b],
    )
  ).rows[0].id;
  await as(ids.b);
  await db.query("select public.respond_date_request($1,'accepted')", [req]);
  await db.query("select public.respond_date_request($1,'declined')", [req]);
  await as(ids.a);
  await db.query('select public.block_profile($1,true)', [ids.b]);
  assert.equal(
    (await db.query('select * from public.discover_profiles()')).rows.length,
    0,
  );
  await db.query('select public.block_profile($1,false)', [ids.b]);
  // Public profile edits cannot silently retain prior approval.
  await db.query("update public.profiles set bio='Edited bio' where id=$1", [
    ids.a,
  ]);
  assert.equal(
    (await db.query('select status from public.profiles')).rows[0].status,
    'pending',
  );
  await as(null, 'anon');
  assert.equal(
    (await db.query('select * from public.public_profiles')).rows.length,
    1,
  );
  await as(ids.admin);
  await db.query(
    "select public.admin_review_profile($1,'approved','Re-reviewed')",
    [ids.a],
  );
  await db.query(
    "select public.admin_review_payment($1,'refunded','Refund reviewed',299,'REFUND-001')",
    [pa],
  );
  await as(ids.a);
  await assert.rejects(
    () => db.query('select * from public.discover_profiles()'),
    /approved/,
  );
  await db.query('select public.request_account_deletion()');
  await root();
  await db.query('delete from auth.users where id=$1', [ids.a]);
  const del = (
    await db.query('select status,user_id from public.deletion_requests')
  ).rows[0];
  assert.equal(del.status, 'completed');
  assert.equal(del.user_id, null);
  const rls = (
    await db.query(
      "select relname from pg_class where relnamespace='public'::regnamespace and relkind='r' and not relrowsecurity",
    )
  ).rows;
  assert.equal(rls.length, 0, 'every application table has RLS');
  await db.close();
});
