# Dream 1 — MVP Design Document

## Premise

A top-down 2D narrative exploration game. The player controls Aldric, who wakes up in a peaceful medieval village. Eventually a monster comes and kills him. He wakes up again. The loop repeats. By doing specific things across loops, the player can eventually exit the dream entirely and reach the **Sky Bridge** — a hub where they will (post-MVP) access other dreamers' dreams.

The player does not yet know any of this. The MVP ends the moment they first exit Aldric's dream.

Inspirations: Outer Wilds (knowledge as progression), Tunic (discovery of rules), Blue Prince (spatial puzzles across runs), Zelda: A Link to the Past (top-down 2D feel).

## Long-term narrative context (not in MVP)

There are 6 dreamers total. Each has their own dream with their own setting, but the same 6 souls appear in every dream with different appearances. The dreams share underlying spatial geometry. The dreamers are being held in a lab to study their dreams; the cover story is trauma research, but the real goal is training an AI to read and influence minds. Late in the game, the player discovers they *are* that AI. The "monster" in each dream is the AI itself (dreamer #7), which the player is unknowingly.

None of this is revealed in the MVP. But several details in Dream 1 foreshadow it.

## Tech stack

- Vanilla HTML, CSS, JavaScript
- Single `<canvas>` element for rendering
- Data-driven content via JSON files
- No frameworks, no build tools, no npm
- Placeholder art = colored rectangles with text labels; real art replaces them later
- Will port to Godot post-MVP

## Map — Dream 1: The Valley

5x5 grid of rooms. Square at center. Each room is 15x15 tiles with a 1-tile border.

```
[Mtn Peak ] [Mtn Pass ] [Woods N  ] [Shrine   ] [River N  ]
[Mtn Foot ] [Path N   ] [Well     ] [Woods E  ] [River S  ]
[Field W  ] [Path W   ] [SQUARE   ] [Path E   ] [Shore    ]
[Cottage ] [Path S   ] [Bakery   ] [Path SE  ] [Dock     ]
[Cottage W] [Field SW ] [Field S  ] [Field SE ] [Boathouse]
```

**Essential rooms for first playable build (8):** Cottage, Path S, Bakery, Square, Well, Path N, Mountain Pass, Shore.

**Soft blocks at map edges**: Mountain Peak inaccessible (rockfall), rivers impassable, map edges blocked with flavor text.

## The 6 dreamers (souls visible in Dream 1)

| # | Name | Role in Dream 1 | Location | Soul trait |
|---|------|-----------------|----------|------------|
| 1 | Aldric | Protagonist (player) | Cottage (start) | Naive optimism |
| 2 | Lyra | Baker | Bakery | Searching for a lost loved one |
| 3 | Cass | Reckless hunter | Woods N | Boldness, goes first |
| 4 | Tomas | Cautious hunter | Path N / Mtn Foot | Caution, holds back |
| 5 | Wem | Old fisherman | Shore / Dock | Memory, half-glimpsed truths |
| 6 | Halden | Shrine keeper | Shrine | Authority, knows more |

**Mentioned but unseen**: Lyra's father (lost in the mountains), Cass and Tomas's mother (deceased), villagers in general.

**The empty blacksmith**: blacksmith shop on the Square is open but empty; sword on the rack with a note from "M." Other half-finished tasks scattered around the village reinforce "more people should be here."

## Core mechanics

**Player verbs (total)**: Move, Interact, Attack, Open Journal, Use Item.

- **Movement**: 4-directional grid, one tile at a time. Either tap or held key for repeat.
- **Interaction**: One button. Talk to NPCs, examine objects, pick up items.
- **Inventory**: Small (8 slots max). Holds key items.
- **Journal**: Auto-fills with key observations. Persists across loops via the charm.
- **Combat**: Sword stuns the monster; cannot kill it.
- **Dream loop**: Death or specific actions reset the world. Charm + journal persist.

## Items

| Item | Source | Persists across loops? |
|------|--------|------------------------|
| Sword | Blacksmith's shop rack (Square) | No |
| Charm | Halden at the Shrine | **Yes** |
| Key | Halden at the Shrine (given alongside charm on later loops) | No |
| Rope | Cottage chest (unlocked by key) | No |
| Locket | Cottage W (Cass/Tomas's old home) | No |
| Hunting horn | Mtn Foot (dropped by Cass after being warned) | See note below |

**Persistence rules**: Only the charm and journal persist across loops. Everything else resets. *Exception*: once Cass has died from being warned about the monster in any past loop, his body and dropped horn appear at Mtn Foot in every subsequent loop (the dream "absorbing" his death). Discretionary — can be cut if simpler is preferred.

## NPC dialogue: data-driven and loop-aware

Each NPC's dialogue is a JSON structure with conditions:

```json
"wem": {
  "default": ["The river's quiet today. Wasn't always so."],
  "loop_gte_2": ["You've got that look. Like you've seen this morning before."],
  "after_monster_seen": ["I dreamt of it. The thing from the mountain. Many times."]
}
```

Conditions include: loop count, items held, NPCs talked to, monster seen, journal entries, etc.

## The monster

A creature that spawns in Mountain Pass and pursues Aldric. Cannot be killed.

**Trigger conditions (narrative)**:
- `sword_acquired` AND
- `halden_charm_received` AND
- `npcs_met_count >= 3`

When all true → 45-second delay → monster spawns.

**Trigger condition (fallback)**:
- `unique_tiles_visited >= 80` (tunable)
- → 15-second delay → monster spawns.

Whichever fires first wins.

**On trigger**:
- Visual: screen tint shifts (soft red/grey)
- Audio: ambient music fades, low rumble begins (placeholder OK)
- NPCs play "panic" dialogue if interacted with after this

**Monster behavior**:
- Spawns in Mountain Pass
- Moves 1 tile every 0.7s (tunable) using BFS pathfinding toward Aldric
- Cannot be killed
- Sword stuns for 2s when adjacent and attack pressed
- Hunting horn distracts for 10s when blown (monster diverts to horn's location)
- Touching Aldric → loop resets

## The progression (paths and unlocks)

### Loop 1: Pure exposure
- Wake up, walk through village, meet NPCs, get sword, get charm from Halden
- Monster triggers, kills Aldric
- Player understands: this loops

### Loop 2: Agency within the loop
- Warn Lyra → she hides in bakery cellar, survives longer, gives a new line
- Warn Cass → he goes up the mountain to "scout," dies offscreen
  - From Loop 3 onward, his horn is at Mtn Foot
- Talk to Tomas about Cass → he mentions their childhood home in Cottage W
- Explore further before the monster arrives

### Loop 3+: Item combinations
- Enter Cottage W (always unlocked, but no reason to go there before knowing about it) → find locket
- Show locket to Lyra → she recognizes the design ("My father had one like that")
- Examine Halden's shrine closely → notice geometric symbols
- Hunting horn + going to Mtn Pass before monster arrives → blow horn distracts monster
- Behind a stuck cart in Mtn Pass: a child's drawing matching the shrine's symbols
- Show drawing to Halden → she gives a small key
- Key opens Aldric's cottage chest → rope inside

### Loop 5 (or whenever ready): The exit

**Required items in inventory at the Well**:
- Charm (already persistent)
- Rope
- Locket

**Action sequence at the Well**:
1. Drop locket into Well → Well activates (audio + visual cue: glow, a child's voice echoing)
2. Use rope on Well → climb-in prompt
3. Confirm jump while holding charm → exit to Sky Bridge

**The challenge**: must be done while monster is active. Solution: blow hunting horn somewhere south of the village to bait the monster away, then sprint north to the Well and complete the sequence.

**Failure modes**:
- No locket: Well doesn't activate, time wasted, monster catches Aldric
- No rope: Cannot enter Well at all
- No charm: Jumping in just loops normally (no dream exit)
- Monster catches Aldric mid-sequence: loop resets

### Soft blocks in MVP
- Can't climb Mountain Peak (rockfall)
- Can't cross rivers (impassable / no boat)
- Can't leave map edges (invisible wall + flavor text)
- Can't kill monster (sword bounces off, journal entry confirms)
- Can't permanently save any NPC — they always die in the end

## Foreshadowing seeded in Dream 1

- Halden's shrine: too geometric, oddly clinical details on close inspection
- Wem's stories: mentions a "white room" and other settings from other dreams
- The Well's echo: doesn't sound like a normal well when examined
- Halden's charm: she gives it knowingly, says "remember what you can"
- Empty blacksmith / half-finished tasks: why only 6 visible people?
- The locket's symbol: subtly matches markings on the shrine
- Halden's mirror (optional): reflection lags by a fraction of a second
- The journal entries gradually shift in tone — handwriting changes after the well exit

## Sky Bridge (MVP placeholder)

A single "room" the player enters after a successful dream exit. For MVP, just a black-or-starry-background screen with a placeholder message ("You are between dreams.") and a single visible Well representing the way back to Aldric's dream. Future dreams will be accessible from here in later builds.

## File structure

```
/data
  /rooms
    /dream1
      cottage.json
      path_s.json
      bakery.json
      ... etc
  /dialogue
    dream1.json
  items.json
  npcs.json
  dreams.json
  progression.json     (flags, unlock conditions)
/sprites
  /placeholders        (your art replaces these)
/src
  main.js              (entry point, game loop)
  rooms.js             (load + render rooms)
  movement.js          (player input + tile-based motion)
  inventory.js         (item state)
  dialogue.js          (dialogue UI + condition evaluation)
  journal.js           (journal state + UI)
  combat.js            (monster behavior + sword)
  dream_state.js       (loop, flags, persistence, reset)
index.html
style.css
README.md
DESIGN.md              (this file)
```

## Build phases

Each phase is one focused Claude Code session. Commit to git between phases.

- **Phase 0**: Project foundation. Hello-world grid render.
- **Phase 1**: Room JSON schema + renderer.
- **Phase 2**: Player movement + room transitions.
- **Phase 3**: Interactables + inventory.
- **Phase 4**: Dialogue system (loop-aware).
- **Phase 5**: Journal + global game state.
- **Phase 6**: Dream loop / reset mechanism.
- **Phase 7**: Monster + combat + triggers.
- **Phase 8**: Populate Dream 1 content (rooms, NPCs, items).
- **Phase 9**: The MVP ending sequence (Well exit + Sky Bridge).

## MVP success criteria

A player can:
1. Wake up, learn the controls, explore the village
2. Meet all 5 other NPCs and have meaningful interactions
3. Get the sword and the charm
4. Experience the monster encounter and die
5. Recognize they're in a loop on respawn
6. Through experimentation across loops, discover the items and the Well's mechanic
7. Execute the final loop: bait the monster, drop the locket, use the rope, jump with the charm
8. Reach the Sky Bridge
9. Feel curious enough to want more

## Out of scope for MVP

- Other 5 dreams (Lyra's, twins', Wem's, Halden's, the AI's dream)
- Cross-dream object translation
- The big reveals (lab, AI twist)
- Combat beyond the single monster
- Sound design (placeholder beeps fine for now)
- Real art (player will produce; placeholders for development)
- Save/load (single-session play for MVP)

## Tuning targets (subject to playtest)

- Single loop length: ~5-10 minutes for a focused player on later loops
- Total playthrough: ~30-60 minutes across 4-6 loops
- Monster's tile-per-step interval: 0.7s
- Player's tile-per-step interval: ~0.15-0.2s when held
- Narrative trigger delay before monster spawn: 45s
- Fallback (tile-count) trigger delay: 15s
- Sword stun: 2s
- Horn distraction: 10s
- Tile-count fallback threshold: 80 unique tiles visited
