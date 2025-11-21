insert into public.tags (name)
values ('心情'), ('记忆'), ('告别')
on conflict (name) do nothing;

insert into public.memory_cards (id, owner, title, content, media_type, is_private)
values
  (
    uuid_generate_v4(),
    '{{AUTH_USER_ID}}',
    '第一次录下奶奶的声音',
    '她对我说：“别怕忘了我，我们在录音里见面。”',
    'audio',
    false
  )
on conflict do nothing;

