-- SPEC 07: añade Tetris al catálogo de juegos.

insert into public.games (id, title, short, long, cat, cover, color, sort_order)
values (
  'tetris',
  'TETRIS',
  'Encaja piezas, completa líneas y aguanta la caída.',
  'Siete tetrominós descienden por un tablero de 10×20. Muévelos, rótalos y suéltalos para completar filas: 1, 2, 3 o 4 líneas a la vez puntúan cada vez más. Cada 10 líneas subes de nivel y la caída se acelera. Si una pieza nueva no cabe, la partida termina.',
  'PUZZLE',
  'cover-tetro',
  'cyan',
  10
);
