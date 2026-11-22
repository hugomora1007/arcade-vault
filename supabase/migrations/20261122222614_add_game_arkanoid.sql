-- SPEC 08: añade Arkanoid al catálogo de juegos.

insert into public.games (id, title, short, long, cat, cover, color, sort_order)
values (
  'arkanoid',
  'ARKANOID',
  'Rompe todos los bloques sin dejar caer la pelota.',
  'Mueve la paleta para rebotar la pelota y destruir los bloques de 5 niveles con patrones distintos. Cada bloque suma 10 puntos y la pelota se acelera un 10 % por nivel. Tienes 3 vidas: si la pelota cae por debajo de la paleta pierdes una.',
  'ARCADE',
  'cover-bricks',
  'magenta',
  11
);
