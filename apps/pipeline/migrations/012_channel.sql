-- The public Telegram channel's posts (src/channel.ts): what each post listed, so no role is posted twice. A post
-- counts once Telegram has taken it (sent_at); one that never got there is dropped and its roles can go next time.
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
