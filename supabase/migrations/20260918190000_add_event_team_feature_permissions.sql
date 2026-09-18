alter table public.event_team_members
  add column if not exists feature_permissions text[];

comment on column public.event_team_members.feature_permissions is
  'Optional event workspace feature allow-list. Null uses the selected role preset.';

