# Pokerdle

A bilingual Pokémon deduction and recall game with a Nintendo pop interface. Daily Kanto (151 Pokémon), Daily Complete (898, Gen I–VIII), unlimited training, generation completion, 60-second Sprint, local statistics and a personal Pokédex.

## Run locally

```sh
nvm use
yarn install
yarn dev
```

Node 22.21.1 is pinned in `.nvmrc`; Next.js requires Node >=20.9. Use Yarn, with `yarn.lock` committed.

## Checks

```sh
yarn lint
yarn test
yarn build
yarn playwright install chromium webkit
yarn test:e2e
```

Browser tests cover Chromium desktop, Android emulation and WebKit iPhone emulation. Real device testing is still advisable for virtual keyboard behavior. The test server uses port 3100.

Set `PLAYWRIGHT_BASE_URL` to reuse an existing dev server, and optionally `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to use an installed Chrome/Chromium executable for desktop and Android projects. The iOS project still requires Playwright WebKit.

## Rules

8 guesses; generation and evolution stage give higher/lower arrows. Types are green in the correct slot, yellow in the other slot, gray when absent. An optional first-letter hint unlocks after 4 misses and is marked in shared results. Dailies reset at 00:00 UTC, with separate streaks. In-progress games can be finished after midnight. Training lets players choose generations.

## Recall modes

Complete the Pokédex starts with a generation choice (I–VIII), accepts names in any order, and fills a compact grid of numbered National Pokédex slots. Names and sprites appear only after correct answers. A stopwatch starts on generation selection, runs through background tabs, and stops on the last correct name. The shortest completion time is saved per generation and shown on the page and in statistics. This mode keeps its current round in page memory only: restarting, changing generation, reloading or leaving the page clears all answers and resets the timer, while preserving personal bests. Incomplete rounds never set a record.

Sprint starts explicitly, runs for 60 seconds, and gives one point per unique Pokémon from the selected generation. Wrong names, other generations and duplicates cost no points. A fixed deadline survives reloads, navigation and background tabs; guesses at or after the deadline are rejected. Personal bests, completed-round counts and the latest score are stored per generation, including rounds with zero points.

Both modes require complete names without autocomplete, accepting Italian/English names and normalized punctuation, accents and gender symbols (`Nidoran-f` / `Nidoran-m`). Sprint sessions, Sprint records and completion best times (milliseconds) are stored separately under `pokerdle:recall:v1`; older saves load with empty completion records, and legacy completion answers are discarded while preserving Sprint data. Neither mode adds captures to the deduction collection. Statistics show both memory modes’ records.

## Data and persistence

`data/catalog.json` is bundled: no API requests occur during guesses or builds. Regenerate with `yarn catalog:generate` (Python 3, internet required), using official PokéAPI CSVs. Only default species forms are included; branching evolution stages use the full parent graph. Five home illustrations are local; other sprites use the official PokéAPI repository, with a Poké Ball fallback on failure.

`lib/game.ts` defines the versioned UTC daily sequence and pure game/statistics functions. The catalog and sequence are fixed for v2; changing the pool or sequence needs a new puzzle version. Progress is versioned in `localStorage` under `pokerdle:v2`. Statistics record each concluded session once. If storage is unavailable, the game works in memory with a notice. Progress is specific to the browser and profile; clearing browser storage removes it. No account, backend or competitive anti-cheat is provided.

Routes: `/` home, `/kanto` Kanto daily, `/classic` full daily, `/training` unlimited, `/completion` generation recall, `/sprint` timed recall, `/pokedex` collection. Legacy `/hard` permanently redirects to `/training`.

Italian and English UI, browser language detection, local language preference, reduced-motion support, accessible dialogs and keyboard-operated search.

Pokémon data/artwork: [PokéAPI](https://pokeapi.co/), [PokéAPI sprites](https://github.com/PokeAPI/sprites). Pokémon belongs to Nintendo, Game Freak and The Pokémon Company. This is an unaffiliated fan project.
