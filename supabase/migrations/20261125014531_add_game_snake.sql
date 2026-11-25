-- SPEC 09: añade Snake al catálogo de juegos.

insert into public.games (id, title, short, long, cat, cover, color, sort_order)
values (
  'snake',
  'SNAKE',
  'Come frutas, crece y no choques contigo misma.',
  'Guía a la serpiente por un tablero de 20×15 casillas y come las frutas que aparecen. Cada fruta suma 10 puntos y alarga a la serpiente; cada 5 frutas subes de nivel y ella se mueve más rápido. Si chocas con un muro o con tu propia cola, se acabó la partida.',
  'ARCADE',
  'cover-snake',
  'green',
  12
);
