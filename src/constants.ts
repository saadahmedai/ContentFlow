import { User, Channel } from './types';

export const USERS: Record<string, User> = {
  saad: {
    key: 'saad',
    name: 'Saad',
    role: 'admin',
    pin: '1234',
    avatar: '👨‍💼',
    emails: ['nagharasad@gmail.com'],
  },
  sarim: {
    key: 'sarim',
    name: 'Sarim',
    role: 'editor',
    pin: '5678',
    avatar: '👨‍💻',
    emails: ['sarimk3110@gmail.com', 'aviyashark@gmail.com'],
  },
};

export const DEFAULT_CHANNELS: Channel[] = [
  { id: 'mrglintbone', name: 'MrGlintBone', color: '#60a5fa', platforms: ['Shorts', 'TikTok', 'Facebook', 'Instagram'] },
  { id: 'secondperson', name: 'SecondPerson', color: '#f87171', platforms: ['YouTube'] },
  { id: 'fruittlore', name: 'FruittLore', color: '#fbbf24', platforms: ['TikTok'] },
];

export const WEEKLY_SCHEDULE = {
  Monday: {
    upload: 'MrGlintBone',
    tasks: [
      { assignee: 'both', title: 'Weekly ideation session', desc: 'Lock MrGlintBone concepts + brainstorm FruittLore ideas' },
      { assignee: 'sarim', title: 'Batch prep MrGlintBone prompts', desc: 'Prep prompts + images for Mon–Wed videos' },
      { assignee: 'saad', title: 'Edit & finalize MrGlintBone', desc: "Finalize today's upload, queue next edits" },
    ],
  },
  Tuesday: {
    upload: 'MrGlintBone',
    tasks: [
      { assignee: 'sarim', title: 'Continue MrGlintBone prompts', desc: 'Prep prompts + images for Thu–Fri videos' },
      { assignee: 'sarim', title: 'Start FruittLore Thursday video', desc: 'Prompts + AI images' },
      { assignee: 'saad', title: 'Edit MrGlintBone videos', desc: 'Begin FruittLore Thursday edit once images arrive' },
    ],
  },
  Wednesday: {
    upload: 'MrGlintBone',
    tasks: [
      { assignee: 'sarim', title: 'Finalize FruittLore Thursday', desc: 'Deliver prompts + images to Saad' },
      { assignee: 'saad', title: 'Finalize FruittLore Thursday', desc: 'Ready for Thursday upload' },
      { assignee: 'saad', title: 'Continue MrGlintBone editing', desc: 'Editing for the rest of the week' },
    ],
  },
  Thursday: {
    upload: 'MrGlintBone + FruittLore',
    tasks: [
      { assignee: 'both', title: 'Finalize SecondPerson concept', desc: 'Lock idea, decide format' },
      { assignee: 'sarim', title: 'SecondPerson production', desc: 'Write script, make prompts, generate images' },
      { assignee: 'sarim', title: 'FruittLore Sunday video', desc: 'Start prompts + AI images' },
      { assignee: 'saad', title: 'Begin SecondPerson edit', desc: 'As images come in from Sarim' },
    ],
  },
  Friday: {
    upload: 'MrGlintBone',
    tasks: [
      { assignee: 'sarim', title: 'Deliver SecondPerson images', desc: 'Finalize FruittLore Sunday + MrGlintBone images' },
      { assignee: 'saad', title: 'Heavy editing day', desc: 'SecondPerson main edit + FruittLore Sunday video' },
    ],
  },
  Saturday: {
    upload: 'MrGlintBone',
    tasks: [
      { assignee: 'saad', title: 'Finalize SecondPerson + FruittLore', desc: 'Ready for Sunday upload, edit MrGlintBone' },
      { assignee: 'sarim', title: 'Review finished videos', desc: 'Flag any changes' },
      { assignee: 'both', title: 'Final approval', desc: 'Greenlight Sunday uploads, write captions and titles' },
    ],
  },
  Sunday: {
    upload: 'MrGlintBone + SecondPerson + FruittLore',
    tasks: [
      { assignee: 'both', title: 'Publish all three channels', desc: 'Publish to all platforms' },
      { assignee: 'both', title: 'Debrief & Brainstorm', desc: "Performance review + next week's SecondPerson concept" },
      { assignee: 'sarim', title: 'Prep next week MrGlintBone', desc: 'Prompts + images for next week early days' },
    ],
  },
};
