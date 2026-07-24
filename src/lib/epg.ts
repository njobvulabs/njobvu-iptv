import { Channel, EPGProgram } from '../types';

const PROGRAM_TITLES_BY_CATEGORY: Record<string, { title: string; desc: string }[]> = {
  News: [
    { title: 'Global News Live', desc: 'Breaking news, in-depth reports, and live interviews from correspondents worldwide.' },
    { title: 'Morning Edition Bulletin', desc: 'Start your day with top headlines, financial updates, and weather forecasts.' },
    { title: 'The Evening Debate', desc: 'Expert panelists analyze current affairs, politics, and global events.' },
    { title: 'Market Watch & Economy', desc: 'Real-time stock updates, tech trends, and financial insights.' },
    { title: 'World Report Special', desc: 'Investigative journalism and special feature stories from around the globe.' }
  ],
  Sports: [
    { title: 'Live Championship Match', desc: 'Action-packed live coverage of today’s top sporting competition.' },
    { title: 'Sports Highlights Hour', desc: 'Replay of key goals, home runs, touchdowns, and dramatic game moments.' },
    { title: 'Game Day Analysis', desc: 'Coaches and former pro athletes break down tactics, team stats, and predictions.' },
    { title: 'Extreme Sports World', desc: 'High-adrenaline skateboarding, surfing, snowboarding, and motocross.' },
    { title: 'Motorsport Grand Prix', desc: 'Live racing coverage featuring lap updates and pit lane strategy.' }
  ],
  Movies: [
    { title: 'Action Cinema Showcase', desc: 'High-octane blockbuster movie featuring intense stunts and heroic rescues.' },
    { title: 'Classic Hollywood Feature', desc: 'A timeless award-winning classic film remastered in high definition.' },
    { title: 'Sci-Fi Thriller Night', desc: 'Futuristic adventure exploring deep space and futuristic AI worlds.' },
    { title: 'Romantic Comedy Hour', desc: 'Charming laugh-out-loud story of unexpected romance and friendships.' },
    { title: 'Mystery & Crime Mystery', desc: 'Intriguing detective film unraveling a dark suspenseful case.' }
  ],
  'TV Shows': [
    { title: 'Crime Scene Investigators S4', desc: 'Detective team uncovers crucial evidence to solve a mysterious cold case.' },
    { title: 'Hospital ER Drama S2', desc: 'High-stakes medical drama inside a busy urban trauma center.' },
    { title: 'Sitcom Comedy Block S3', desc: 'Hilarious misadventures of eccentric friends living in the big city.' },
    { title: 'Sci-Fi Odyssey S1', desc: 'Explorers travel through wormholes in search of a new Earth.' },
    { title: 'Historical Period Drama S5', desc: 'Intrigue and power struggles in a 19th-century royal court.' }
  ],
  Comedy: [
    { title: 'Stand-Up Comedy Special', desc: 'Top international comedians perform live in an exclusive hilarious special.' },
    { title: 'Pranks & Bloopers Extravaganza', desc: 'Candid camera pranks, hilarious fails, and viral internet bloopers.' },
    { title: 'Late Night Comedy Club', desc: 'Monologues, celebrity interviews, and funny sketch comedy.' }
  ],
  Kids: [
    { title: 'Animated Heroes Adventures', desc: 'Fun colorful cartoon featuring heroic animals saving the forest.' },
    { title: 'Fun Science & Magic', desc: 'Interactive educational show packed with fun experiments and magic tricks.' },
    { title: 'Bedtime Fairy Tales', desc: 'Gentle animated stories and lullabies to calm young viewers.' }
  ],
  Music: [
    { title: 'Top 40 Music Countdown', desc: 'The hottest chart-topping music videos and exclusive artist interviews.' },
    { title: 'Live Concert Stage', desc: 'Spectacular live performance by world-renowned pop and rock icons.' },
    { title: 'Acoustic Sessions Live', desc: 'Intimate unplugged studio performances and soulful cover songs.' }
  ],
  Documentaries: [
    { title: 'Planet Earth: Deep Oceans', desc: 'Explore rare marine life and underwater ecosystems in 4K clarity.' },
    { title: 'Secrets of Ancient History', desc: 'Archeologists unlock mysteries of forgotten empires and monuments.' },
    { title: 'Cosmos & Quantum Physics', desc: 'Stunning visual journey into black holes, galaxies, and dark matter.' }
  ],
  General: [
    { title: 'Daily Lifestyle & Travel', desc: 'Explore exotic destinations, delicious local cuisine, and culture.' },
    { title: 'Home & Garden Makeover', desc: 'Renovation experts transform old houses into stunning dream homes.' },
    { title: 'Prime Time Entertainment', desc: 'Variety showcase featuring musical performances, games, and celebrity guests.' }
  ]
};

// Generate deterministic current & next programs based on time and channel ID
export function getCurrentAndNextEPG(channel: Channel, targetTimeMs: number = Date.now()): {
  current: EPGProgram;
  next: EPGProgram;
  progressPercent: number;
  minutesRemaining: number;
} {
  const categoryKey = channel.categories.find(c => PROGRAM_TITLES_BY_CATEGORY[c]) || 'General';
  const catalog = PROGRAM_TITLES_BY_CATEGORY[categoryKey] || PROGRAM_TITLES_BY_CATEGORY.General;

  // Simple hashing function for seed
  let hash = 0;
  for (let i = 0; i < channel.id.length; i++) {
    hash = (hash << 5) - hash + channel.id.charCodeAt(i);
    hash |= 0;
  }
  const seed = Math.abs(hash);

  // Program duration 45 mins (2700000ms) or 60 mins (3600000ms)
  const durationMs = ((seed % 2) === 0 ? 45 : 60) * 60 * 1000;
  
  // Calculate slot index based on time
  const slotNumber = Math.floor(targetTimeMs / durationMs);
  const currentStartTime = slotNumber * durationMs;
  const currentEndTime = currentStartTime + durationMs;

  const currentIndex = (seed + slotNumber) % catalog.length;
  const nextIndex = (seed + slotNumber + 1) % catalog.length;

  const currentProg = catalog[currentIndex];
  const nextProg = catalog[nextIndex];

  const current: EPGProgram = {
    id: `${channel.id}_${slotNumber}`,
    channelId: channel.id,
    title: currentProg.title,
    description: currentProg.desc,
    category: categoryKey,
    startTime: currentStartTime,
    endTime: currentEndTime,
  };

  const next: EPGProgram = {
    id: `${channel.id}_${slotNumber + 1}`,
    channelId: channel.id,
    title: nextProg.title,
    description: nextProg.desc,
    category: categoryKey,
    startTime: currentEndTime,
    endTime: currentEndTime + durationMs,
  };

  const elapsed = Math.max(0, targetTimeMs - currentStartTime);
  const progressPercent = Math.min(100, Math.max(0, (elapsed / durationMs) * 100));
  const minutesRemaining = Math.max(1, Math.ceil((currentEndTime - targetTimeMs) / (60 * 1000)));

  return {
    current,
    next,
    progressPercent,
    minutesRemaining
  };
}

export function formatEPGTime(timestampMs: number): string {
  const date = new Date(timestampMs);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
