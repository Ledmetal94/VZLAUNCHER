export interface QuickStart {
  objective: string
  controls: string[]
  tips: string[]
}

export interface TutorialStep {
  title: string
  body: string
}

export interface GameTutorial {
  slug: string
  quickstart: QuickStart
  steps: TutorialStep[]
  pdfUrl?: string
}

export const TUTORIALS: GameTutorial[] = [
  {
    slug: 'terminator-uprising',
    quickstart: {
      objective: 'Survive waves of machines and destroy the central core before time runs out.',
      controls: ['Aim & shoot: point controller at targets', 'Reload: shake controller down', 'Dodge: physically move your body', 'Special attack: hold trigger 2 seconds'],
      tips: ['Stay mobile — standing still makes you an easy target', 'Focus on heavy units first', 'Reload during enemy movement pauses'],
    },
    steps: [
      { title: 'Put on your headset', body: 'Wear the VR headset and adjust the strap until the image is clear. Make sure you can see all four corners of the screen.' },
      { title: 'Grab your controllers', body: 'Pick up both controllers. Your right hand is your primary weapon. Hold the trigger to aim — no button needed.' },
      { title: 'Calibrate your play area', body: 'Look around the room. The blue grid shows your safe zone. Stay inside it at all times.' },
      { title: 'Start the mission', body: 'Machines will spawn from multiple directions. Shoot the glowing red cores on each unit to destroy them.' },
      { title: 'Defeat the boss', body: 'After 3 waves, the Terminator core appears. Shoot it 10 times while avoiding its laser sweep.' },
    ],
  },
  {
    slug: 'cyber-shock',
    quickstart: {
      objective: 'Hack enemy nodes and eliminate all hostiles to advance through the city grid.',
      controls: ['Move: teleport by pointing and clicking thumbstick', 'Shoot: trigger button', 'Hack: hold grip near terminal for 3 seconds', 'Dash: double-tap thumbstick'],
      tips: ['Use cover — peek from behind walls to avoid damage', 'Hack terminals to disable enemy shields', 'Collect credits to upgrade your weapon mid-run'],
    },
    steps: [
      { title: 'Enter the Grid', body: 'You\'re a rogue hacker in Neo-City. Your mission: destroy the corporate surveillance network.' },
      { title: 'Teleport movement', body: 'Point your controller at the floor and click the thumbstick to teleport. You can only teleport to lit surfaces.' },
      { title: 'Hacking terminals', body: 'Blue terminals can be hacked. Hold your grip button near them and wait 3 seconds. Hacking disables nearby drones.' },
      { title: 'Combat basics', body: 'Enemies take 3 hits to kill. Aim for the head for a one-shot takedown. Shields must be hacked off first.' },
      { title: 'Reaching the boss', body: 'Complete all 5 sector nodes to unlock the final boss room. The boss requires a hack + 5 shots combo to defeat.' },
    ],
  },
  {
    slug: 'dead-ahead',
    quickstart: {
      objective: 'Hold your position and survive all zombie waves. Last player standing wins.',
      controls: ['Shoot: trigger', 'Melee: swing controller', 'Reload: press side button', 'Revive teammate: hold grip on downed player for 3 seconds'],
      tips: ['Cover doors and windows — zombies come from everywhere', 'Save ammo on small zombies — melee works fine', 'Revive teammates quickly — you need all hands on deck'],
    },
    steps: [
      { title: 'Grab your weapon', body: 'Reach to your hip to grab your pistol. Reach over your shoulder for the shotgun. Each has limited ammo.' },
      { title: 'Barricade check', body: 'Before round 1 starts, reinforce doors by pressing them. Each door takes 3 hits to break.' },
      { title: 'Wave survival', body: 'Waves get harder every round. Special zombies appear from round 3 — they require 2x damage to kill.' },
      { title: 'Reviving teammates', body: 'If a teammate goes down, approach them and hold the grip button for 3 seconds. Leave no one behind.' },
      { title: 'Final wave', body: 'Wave 10 is the boss rush. All zombie types at once. Focus fire and use your special melee ability.' },
    ],
  },
  {
    slug: 'quantum-arena',
    quickstart: {
      objective: 'Eliminate all opponents using quantum abilities. Last player in the arena wins.',
      controls: ['Jump: thumbstick up', 'Quantum blast: trigger', 'Time slow: left grip button', 'Arena switch: A button'],
      tips: ['Use time-slow sparingly — it has a 10-second cooldown', 'Switch arenas when surrounded — it resets your position', 'Quantum blasts bounce off walls — use corners strategically'],
    },
    steps: [
      { title: 'Enter the Arena', body: 'You\'re in a multi-dimensional battle arena. Physics here work differently — embrace it.' },
      { title: 'Movement and jumping', body: 'Push thumbstick forward to jump. In Quantum Arena, you can jump off walls and even the ceiling.' },
      { title: 'Quantum blast', body: 'Your main weapon fires quantum energy bolts. They bounce once off surfaces and deal area damage on impact.' },
      { title: 'Time slow ability', body: 'Hold your left grip to activate time slow for 3 seconds. Everything slows except you. Use it to dodge or line up shots.' },
      { title: 'Arena switching', body: 'Press A to quantum-jump to another dimension. Your opponents stay behind. Use it to escape or reposition.' },
    ],
  },
  {
    slug: 'arrowsong',
    quickstart: {
      objective: 'Hit all targets in each zone to progress. Complete all zones to defeat the Ancient Dragon.',
      controls: ['Draw bow: reach back over shoulder', 'Aim: extend bow arm', 'Release: let go of grip button', 'Special arrow: hold grip 2 seconds before release'],
      tips: ['Take your time — accuracy scores bonus points', 'Moving targets require leading your aim slightly', 'Special arrows pierce through multiple targets'],
    },
    steps: [
      { title: 'Nock your arrow', body: 'Reach over your right shoulder with your left hand. You\'ll feel the bow materialize. Grab it with your grip button.' },
      { title: 'Draw and aim', body: 'Pull your left hand back toward your face to draw the string. Aim with your right arm extended forward.' },
      { title: 'Release', body: 'Release the grip button to fire. The arrow follows a realistic arc — aim slightly above for long distances.' },
      { title: 'Target types', body: 'Static targets give 100 pts. Moving targets give 200 pts. Crystal targets explode and hit nearby enemies for 500 pts.' },
      { title: 'The Dragon boss', body: 'The Ancient Dragon has 3 glowing weak points on its body. Hit all three in quick succession to deal massive damage.' },
    ],
  },
  {
    slug: 'wayfinders',
    quickstart: {
      objective: 'Explore the alien world together, collect artifacts, and solve the planet\'s mystery.',
      controls: ['Move: thumbstick', 'Interact: grip button', 'Scan object: point and hold trigger 2 sec', 'Team signal: Y button'],
      tips: ['Scan everything — hidden artifacts give bonus lore', 'Stay together — puzzles require 2+ players', 'Use team signal to mark interesting areas for your crew'],
    },
    steps: [
      { title: 'Land on Kepler-9', body: 'Your team has crash-landed on an alien world. Explore to find parts to repair your ship.' },
      { title: 'Movement', body: 'Use the thumbstick to walk. You can also physically walk in your real space — the game tracks your movement.' },
      { title: 'Scanning', body: 'Point at any object and hold trigger for 2 seconds to scan it. Scans reveal item descriptions and hidden clues.' },
      { title: 'Cooperative puzzles', body: 'You\'ll find sealed doors requiring 2 players to hold activation pads simultaneously. Communicate and coordinate.' },
      { title: 'Collecting artifacts', body: 'Artifacts are the key to the mystery. Find all 12 to unlock the final revelation sequence.' },
    ],
  },
  {
    slug: 'cops-vs-robbers',
    quickstart: {
      objective: 'Robbers: reach the vault and escape. Cops: stop them before time runs out.',
      controls: ['Sprint: thumbstick click', 'Use gadget: left trigger', 'Tackle / arrest: run into opponent', 'Radio call: B button'],
      tips: ['Robbers: split up to divide police attention', 'Cops: guard exits — the robbers must escape through them', 'Gadgets recharge every 30 seconds — use them at key moments'],
    },
    steps: [
      { title: 'Choose your side', body: 'The game assigns teams. Robbers wear black masks, cops wear blue vests. Both sides see different objectives on screen.' },
      { title: 'Robbers — the heist', body: 'Navigate to the vault room, crack the safe (hold grip on keypad for 5 seconds), then reach an exit point.' },
      { title: 'Cops — the pursuit', body: 'Watch the mini-map for robber positions. Tackle them by physically running into them in VR space.' },
      { title: 'Gadgets', body: 'Robbers have a smoke bomb. Cops have a stun grenade. Hold your left trigger to pull it out, release to throw.' },
      { title: 'Win conditions', body: 'Robbers win by escaping with the loot. Cops win by arresting all robbers before the 5-minute timer expires.' },
    ],
  },
  {
    slug: 'wizard-academy',
    quickstart: {
      objective: 'Master 3 spells and defeat the Shadow Wizard in the final duel.',
      controls: ['Cast spell: specific hand gesture (see in-game guide)', 'Block: hold both controllers up', 'Brew potion: grab ingredients + cauldron gesture', 'Fly: point up + both triggers'],
      tips: ['Each spell has a unique gesture — practice in the training room first', 'Potions last 60 seconds — brew before the boss fight', 'Flying lets you dodge — use it in the final duel'],
    },
    steps: [
      { title: 'Welcome to the Academy', body: 'You\'re a new student at Grimoire Academy. Your first lesson: three fundamental spells.' },
      { title: 'Fireball spell', body: 'Make a fist with your right hand, then open it quickly while pointing forward. The faster the motion, the bigger the fireball.' },
      { title: 'Shield spell', body: 'Cross both controllers in front of you in an X shape. Hold for a sustained shield.' },
      { title: 'Levitation spell', body: 'Point both hands down and push up simultaneously to levitate objects. Use this to solve puzzles.' },
      { title: 'The Shadow Wizard duel', body: 'Your final exam. Use all three spells — fireballs to attack, shield to block, levitation to throw objects at the boss.' },
    ],
  },
  {
    slug: 'monkey-madness',
    quickstart: {
      objective: 'Collect the most bananas before time runs out. Avoid falling off the platforms!',
      controls: ['Jump: squat and stand up fast', 'Grab banana: reach out and grip', 'Throw at others: grab + swing arm', 'Activate power-up: jump on glowing pad'],
      tips: ['Higher platforms have rarer golden bananas worth 5x points', 'Throwing bananas at others steals their points', 'Power-up pads appear every 30 seconds — race to them!'],
    },
    steps: [
      { title: 'Enter the Jungle', body: 'Welcome to Monkey Madness — a floating jungle platform arena. Everyone is a monkey here. Embrace the chaos.' },
      { title: 'Collecting bananas', body: 'Bananas appear around the map. Reach out and grab them with your grip button. Each one scores a point.' },
      { title: 'Jumping between platforms', body: 'Squat down physically and stand up quickly to jump. Higher jumps reach higher platforms with better bananas.' },
      { title: 'Stealing from others', body: 'Grab a banana and throw it at another player to knock points out of them. Aim for direct hits.' },
      { title: 'Golden banana rush', body: 'Every 60 seconds a golden banana appears. It\'s worth 10 points. Everyone scrambles — be first!' },
    ],
  },
  {
    slug: 'plush-rush',
    quickstart: {
      objective: 'Be the last plush standing. Knock opponents off the arena with power-ups and skills.',
      controls: ['Move: thumbstick', 'Jump: A button', 'Attack: trigger', 'Use power-up: B button', 'Taunt: shake both controllers'],
      tips: ['Edge the arena — push opponents toward the borders', 'Save power-ups for when you\'re surrounded', 'Taunting fills your special meter faster'],
    },
    steps: [
      { title: 'Pick your plush', body: 'Choose from 8 plush characters — each has a unique special ability but equal base stats.' },
      { title: 'Movement and combat', body: 'Move with thumbstick. Attack sends a cute but powerful stuffing blast that knocks opponents back.' },
      { title: 'Power-up boxes', body: 'Floating boxes appear across the arena. Grab them to get random power-ups: mega blast, shield, spring shoes, etc.' },
      { title: 'Knockouts', body: 'Knock opponents off the arena edges to eliminate them. Watch your own position near edges.' },
      { title: 'Special ability', body: 'Fill your special meter (by taunting or landing hits) then press B for your character\'s unique move.' },
    ],
  },
  {
    slug: 'cookd-up',
    quickstart: {
      objective: 'Fill the most orders correctly before time runs out. Teamwork is everything!',
      controls: ['Pick up ingredient: grip button', 'Chop: move ingredient onto board and slice', 'Cook: place on stove and wait', 'Serve: carry plate to service window'],
      tips: ['Read the order ticket before grabbing ingredients', 'One player chops, one cooks — divide the work', 'Burnt food = -10 points — watch the timer on the stove'],
    },
    steps: [
      { title: 'Read the order board', body: 'Orders appear on the board above the counter. Memorize what\'s needed before grabbing ingredients.' },
      { title: 'Ingredient prep', body: 'Grab ingredients from the fridge and shelves. Chop vegetables on the cutting board with a slicing motion.' },
      { title: 'Cooking', body: 'Place prepared ingredients on the stove. A progress ring shows cooking time. Remove before it turns red!' },
      { title: 'Plating and serving', body: 'Drag cooked food onto the plate, add garnish if required, then carry the plate to the service window.' },
      { title: 'Speed bonus', body: 'Complete orders in under 30 seconds for a speed bonus. Aim for combo chains of 3+ consecutive correct orders.' },
    ],
  },
]

export function getTutorial(slug: string): GameTutorial | undefined {
  return TUTORIALS.find((t) => t.slug === slug)
}
