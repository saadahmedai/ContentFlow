export type UserRole = 'admin' | 'editor';
export type UserKey = 'saad' | 'sarim';

export interface User {
  name: string;
  role: UserRole;
  pin: string;
  avatar: string;
  key: UserKey;
  emails: string[];
}

export type IdeaStatus = 'pending' | 'approved' | 'discarded' | 'in_pipeline';

export interface Idea {
  id: string;
  title: string;
  channel: string;
  desc: string;
  status: IdeaStatus;
  ratings: Record<UserKey, number>;
  addedBy: UserKey;
  createdAt: number;
  updatedAt: number;
  approvedAt?: number;
}

export type PipelineStage = 'scripting' | 'editing' | 'ready' | 'uploaded';

export interface PipelineItem {
  id: string;
  ideaId: string;
  title: string;
  channel: string;
  stage: PipelineStage;
  dueDate: string; // ISO YYYY-MM-DD
  movedBy: UserKey;
  movedAt: number;
  uploadedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface CompletedItem extends PipelineItem {
  completedAt: number;
}

export interface Channel {
  id: string;
  name: string;
  color: string;
  platforms: string[];
}

export interface AppData {
  ideas: Idea[];
  pipeline: PipelineItem[];
  completed: CompletedItem[];
  deletedIds?: string[];
}

export interface Settings {
  sheetsUrl: string;
  lastSync: number;
  channels: Channel[];
  notificationsEnabled: boolean;
}
