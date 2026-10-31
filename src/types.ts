export interface StreamInfo {
  url: string;
  proxiedUrl: string;
  http_referrer?: string;
  user_agent?: string;
  status?: 'online' | 'offline' | 'untested';
}

export interface Channel {
  id: string;
  registryId: string;
  name: string;
  group?: string;
  logo?: string;
  tvgId?: string;
  category: string;
  urls: string[];
  url: string;
  key: string;
  streams?: StreamInfo[];
  isAvailable?: boolean;
}

export interface Country {
  code: string;
  name: string;
  flag: string;
}

export type CategoryType = 'all' | 'news' | 'sports' | 'entertainment' | 'music' | 'kids' | 'religion' | 'general';

export interface ImpulseLog {
  id: string;
  trigger: string;
  sensation?: string;
  firstThought: string;
  severity: number;
  heuristic: string;
  timestamp: string;
}

export interface MomentCheckin {
  id: string;
  calm: number;
  anxiety: number;
  focus: number;
  timestamp: string;
}

export interface ReframedThought {
  id: string;
  originalLogId?: string;
  alternativeOne: string;
  alternativeTwo: string;
  evidenceScore: number;
  reframedView: string;
  timestamp: string;
}

export interface Episode {
  id: string;
  activityName: string;
  start: string;
  end: string;
  happiness: number;
  stress: number;
  calm: number;
  dayRating: number;
  timestamp: string;
}

export interface WatchmanNote {
  id: string;
  thought: string;
  response: string;
  timestamp: string;
}

export interface PhraseItem {
  id: string;
  category: string;
  phrase: string;
  outcome: string;
  senses: string;
  emotion: string;
  timestamp: string;
}

export interface ReleaseCheckin {
  id: string;
  event: string;
  note?: string;
  acidScore: number;
  timestamp: string;
}

export interface ProgramItem {
  id: string;
  channelName: string;
  showTitle: string;
  category: string;
  startTime: string;
  endTime: string;
  thumbnail?: string;
}
