-- SPEC 06: tablas games y scores, vista game_stats y RLS.

create table public.games (
  id          text primary key check (id ~ '^[a-z0-9-]+$'),   -- slug de la URL
  title       text not null,
  short       text not null,
  long        text not null,
  cat         text not null check (cat in ('ARCADE','PUZZLE','SHOOTER','VERSUS')),
  cover       text not null,                                   -- clase CSS, p. ej. 'cover-bricks'
  color       text not null check (color in ('cyan','magenta','green','yellow')),
  sort_order  integer not null unique,
  created_at  timestamptz not null default now()
);

create table public.scores (
  id           uuid primary key default gen_random_uuid(),
  game_id      text not null references public.games(id) on delete cascade,
  player_name  text not null check (player_name ~ '^[A-Z0-9]{3}$'),
  score        integer not null check (score > 0 and score <= 9999999),
  created_at   timestamptz not null default now()
);

create index scores_game_ranking_idx
  on public.scores (game_id, score desc, created_at asc);

create view public.game_stats with (security_invoker = true) as
  select g.id as game_id,
         coalesce(max(s.score), 0) as best,
         count(s.id)::integer      as plays
  from public.games g
  left join public.scores s on s.game_id = g.id
  group by g.id;

alter table public.games  enable row level security;
alter table public.scores enable row level security;

create policy "games_select_public"  on public.games  for select to anon, authenticated using (true);
create policy "scores_select_public" on public.scores for select to anon, authenticated using (true);
create policy "scores_insert_public" on public.scores for insert to anon, authenticated with check (true);
-- Sin políticas de update ni delete: las filas son inmutables desde la API.

-- Siembra: 9 juegos copiados literalmente de lib/games.ts (sort_order 1..9).
insert into public.games (id, title, short, long, cat, cover, color, sort_order) values
  ('bloque-buster', 'BLOQUE BUSTER',
   'Rebota la pelota y destruye muros de neón.',
   'Pilota una nave-paleta y rebota un núcleo de plasma para pulverizar muros de bloques cromáticos. Cada nivel reorganiza la grilla en patrones imposibles. ¿Hasta dónde llegará tu racha?',
   'ARCADE', 'cover-bricks', 'cyan', 1),
  ('caida', 'CAÍDA',
   'Encaja las piezas antes de que el techo te aplaste.',
   'Piezas geométricas descienden desde la oscuridad. Rótalas, encástralas y limpia líneas para sobrevivir. La velocidad aumenta sin piedad cada 10 líneas.',
   'PUZZLE', 'cover-tetro', 'magenta', 2),
  ('serpentina', 'SERPENTINA',
   'Crece sin morder tu propia cola.',
   'Una serpiente de luz recorre la grilla buscando núcleos magenta. Cada bocado la alarga y la hace más veloz. Un movimiento en falso y se devora a sí misma.',
   'ARCADE', 'cover-snake', 'green', 3),
  ('gloton', 'GLOTÓN',
   'Devora puntos y escapa de los fantasmas.',
   'Un círculo glotón patrulla un laberinto coleccionando puntos luminosos. Cuatro espectros lo persiguen, pero cada cierto tiempo aparece una píldora que invierte los papeles.',
   'ARCADE', 'cover-glot', 'yellow', 4),
  ('invasores', 'INVASORES',
   'Defiende el planeta de filas alienígenas.',
   'Olas de pixeles hostiles descienden formación tras formación. Mueve tu cañón en horizontal y abre fuego con precisión, antes de que toquen la superficie.',
   'SHOOTER', 'cover-invaders', 'green', 5),
  ('rocas', 'ROCAS',
   'Pulveriza asteroides en gravedad cero.',
   'Tu nave triangular flota en vacío absoluto. Dispara y rota para dividir rocas en fragmentos cada vez más pequeños. Cuidado con los OVNIs en el horizonte.',
   'SHOOTER', 'cover-rocas', 'yellow', 6),
  ('ranaria', 'RANARIA',
   'Cruza la autopista de pixeles.',
   'Salta entre carriles de coches a toda velocidad y troncos a la deriva en el río. Llega a los nenúfares antes de que se acabe el tiempo.',
   'ARCADE', 'cover-rana', 'green', 7),
  ('duelo-pixel', 'DUELO PIXEL',
   'Dos paletas. Una pelota. Reflejos máximos.',
   'El duelo más puro: dos paletas verticales se enfrentan por rebotar una pelota luminosa. Modo solitario contra la CPU o partida local a dos jugadores.',
   'VERSUS', 'cover-duelo', 'cyan', 8),
  ('asteroides', 'ASTEROIDES',
   'Sobrevive al campo de asteroides y rompe cada roca.',
   'Pilota tu nave por un campo de asteroides donde el espacio no tiene bordes: lo que sale por un lado aparece por el otro. Rota, propulsa y dispara para partir las rocas grandes en medianas y las medianas en pequeñas. Tienes tres vidas y unos instantes de invencibilidad al reaparecer.',
   'SHOOTER', 'cover-rocas', 'cyan', 9);
