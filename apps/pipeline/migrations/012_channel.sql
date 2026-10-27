-- The public Telegram channel's posts (src/channel.ts): what each post listed, so no role is posted twice. A role
-- counts as posted once a post holds it; sent_at says Telegram took the post, and a post it refused is deleted, so
-- its roles can go in the next one.
create table channel_post (
  id serial primary key,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  text text not null
);

create table channel_item (
  post_id int not null references channel_post (id) on delete cascade,
  posting_id bigint not null references posting (id),
  primary key (post_id, posting_id)
);
