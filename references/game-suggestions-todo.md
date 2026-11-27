# Sugerencias de juegos — ToDo

> Mantenido por el subagente `game-planner`. No borrar entradas: solo moverlas de sección.

## Pendientes

- [ ] ⭐ **ESTELA** (`estela`) · VERSUS · cyan · `cover-duelo` — motos de luz en una rejilla: dejas un muro de neón detrás y debes encerrar a rivales CPU sin chocar. Encaje: primer VERSUS con motor real (0 hoy) y reutiliza la lógica de rejilla y ticks de Snake. Sugerido: 2026-11-25
- [ ] **ENJAMBRE** (`enjambre`) · SHOOTER · green · `cover-invaders` — shooter fijo contra formaciones que bajan y lanzan picados, con escudos destructibles y oleadas. Encaje: refuerza SHOOTER (1 real) y estrena la portada `cover-invaders`. Sugerido: 2026-11-25
- [ ] **ORBITAL** (`orbital`) · SHOOTER · magenta · cover nueva — la nave gira por un anillo y dispara hacia el núcleo, del que emergen enemigos que avanzan hacia fuera. Encaje: shooter con mecánica distinta a Asteroides; requiere portada nueva. Sugerido: 2026-11-25

### Ronda 2 (2026-11-25, 4 instancias en paralelo, una por categoría)

> Puntuaciones /45 no del todo calibradas entre instancias (cada una puntuó Equilibrio según su propia categoría).

#### ARCADE

- [ ] **PERÍMETRO** (`perimetro`) · cyan · cover nueva · 37/45 — captura de territorio dibujando líneas desde el borde; el área se rellena al cerrar; se pasa de nivel al reclamar el 75 %. Sugerido: 2026-11-25
- [ ] **PERFORA** (`perfora`) · yellow · cover nueva · 36/45 — minero que excava una rejilla buscando gemas, con rocas que caen y oxígeno limitado. Sugerido: 2026-11-25
- [ ] **TÚNEL** (`tunel`) · magenta · cover nueva · 36/45 — cueva de scroll con control de un solo botón (subir y caer) que se va estrechando. Sugerido: 2026-11-25
- [ ] **ASCENSO** (`ascenso`) · green · cover nueva · 35/45 — salto vertical infinito por plataformas que se rompen, se mueven o impulsan. Sugerido: 2026-11-25
- [ ] **ALUNIZA** (`aluniza`) · cyan · `cover-rocas` (provisional) · 35/45 — alunizaje con gravedad y combustible sobre plataformas con multiplicador. Sugerido: 2026-11-25

#### PUZZLE

- [ ] **CIRCUITO** (`circuito`) · yellow · cover nueva · 39/45 — colocar conductores en una rejilla 10x7 antes de que avance la corriente; 3 fusibles. Sugerido: 2026-11-25
- [ ] **ORBES** (`orbes`) · magenta · cover nueva · 36/45 — lanzador de orbes contra un panal hexagonal; se juntan 3 del mismo color y el techo va bajando. Sugerido: 2026-11-25
- [ ] **CHISPA** (`chispa`) · green · `cover-tetro` · 36/45 — tablero 8x8 de intercambiar y alinear 3, con barra de energía y cascadas. Sugerido: 2026-11-25
- [ ] **FUSIÓN** (`fusion`) · cyan · cover nueva · 35/45 — deslizar y fusionar núcleos en 5x5, con núcleos corruptos. Sugerido: 2026-11-25
- [ ] **PRISMA** (`prisma`) · magenta · cover nueva · 32/45 — girar espejos y prismas para llevar un láser a los receptores. Sugerido: 2026-11-25

#### SHOOTER

- [ ] **NEXO** (`nexo`) · magenta · cover nueva · 41/45 — shooter de arena de dos ejes (WASD moverse, flechas disparar) contra oleadas geométricas, con combo. Sugerido: 2026-11-25
- [ ] **BASTIÓN** (`bastion`) · yellow · cover nueva · 39/45 — defensa antiaérea de 6 cúpulas con interceptores de explosión en cadena. Sugerido: 2026-11-25
- [ ] **MICELIO** (`micelio`) · green · cover nueva · 39/45 — shooter fijo contra una criatura segmentada que se divide entre cristales. Ojo: solapa con un clásico concreto. Sugerido: 2026-11-25
- [ ] **CENTELLA** (`centella`) · cyan · cover nueva · 38/45 — shooter vertical con patrones de balas, power-ups y jefe cada 5 sectores. Sugerido: 2026-11-25
- [ ] **SONDA** (`sonda`) · magenta · cover nueva · 36/45 — scroll horizontal por una caverna con bombas y combustible que se recarga destruyendo depósitos. Sugerido: 2026-11-25

#### VERSUS

- [ ] **DISCO NEÓN** (`disco-neon`) · magenta · `cover-duelo` · 43/45 — hockey de mesa contra una CPU que mejora con cada rival. Ojo: solapa con el simulado `duelo-pixel`. Sugerido: 2026-11-25
- [ ] **REBOTE** (`rebote`) · cyan · cover nueva · 42/45 — duelo de tanques con balas que rebotan en una arena con muros. Sugerido: 2026-11-25
- [ ] **TERRITORIO** (`territorio`) · green · cover nueva · 42/45 — pintar casillas contra la CPU en 60 s, rellenando contornos. Ojo: solapa con ESTELA y PERÍMETRO. Sugerido: 2026-11-25
- [ ] **EMPUJÓN** (`empujon`) · yellow · cover nueva · 41/45 — sumo de discos en una arena que se encoge, con embestida. Sugerido: 2026-11-25
- [ ] **BALÍSTICA** (`balistica`) · cyan · cover nueva · 35/45 — artillería por turnos con viento y terreno destructible. Sugerido: 2026-11-25

## En spec / implementados

- [x] **ASTEROIDES** (`asteroides`) → `specs/05-asteroids-juego-real.md` (2026-11-25)
- [x] **TETRIS** (`tetris`) → `specs/07-tetris-juego-real.md` (2026-11-25)
- [x] **ARKANOID** (`arkanoid`) → `specs/08-arkanoid-juego-real.md` (2026-11-25)
- [x] **SNAKE** (`snake`) → `specs/09-snake-juego-real.md` (2026-11-25)

## Descartados

_Ninguno._
