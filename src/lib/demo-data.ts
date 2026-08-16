// Central demo data for all Messaivo app pages

export type Page = {
  id: string; name: string; avatar: string; color: string;
  followers: number; messages: number; audience: number;
  lastSynced: string; status: "connected" | "disconnected";
};

export type Customer = {
  id: string; name: string; firstName: string; psid: string;
  pageId: string; pageName: string; avatar: string; color: string;
  lastActivity: string; status: "eligible" | "recent" | "inactive";
  tag: string; convos: number; joined: string;
};

export type Message = {
  id: string; role: "customer" | "agent"; text: string; time: string;
};

export type Conversation = {
  id: string; customerId: string; customerName: string; avatar: string;
  color: string; pageId: string; pageName: string; lastMessage: string;
  time: string; unread: number; status: "open" | "closed" | "assigned";
  messages: Message[];
};

export type Template = {
  id: string; name: string; category: string; body: string;
  updatedAt: string; usageCount: number;
};

export type Broadcast = {
  id: string; name: string; pageId: string; pageName: string;
  status: "draft" | "scheduled" | "completed";
  audience: number; sent: number; opened: number;
  createdAt: string; scheduledAt?: string;
};

export type Group = {
  id: string; name: string; description: string;
  count: number; updatedAt: string; color: string;
};

export type Notification = {
  id: string; type: "conversation" | "broadcast" | "template" | "page" | "group";
  title: string; body: string; time: string; read: boolean;
};

export type AnalyticsPoint = { label: string; conversations: number; responses: number; audience: number; };

// ── Pages ──────────────────────────────────────────────────────────────────────

export const DEMO_PAGES: Page[] = [
  { id: "p1", name: "Royal Gaming Zone", avatar: "RG", color: "#6C63FF", followers: 12400, messages: 847, audience: 1247, lastSynced: "2 min ago", status: "connected" },
  { id: "p2", name: "Elite Cashouts",    avatar: "EC", color: "#22D3EE", followers:  8900, messages: 312, audience:  743, lastSynced: "5 min ago", status: "connected" },
  { id: "p3", name: "Lucky Looters",     avatar: "LL", color: "#10B981", followers:  5200, messages: 189, audience:  491, lastSynced: "12 min ago", status: "connected" },
];

// ── Customers ─────────────────────────────────────────────────────────────────

export const DEMO_CUSTOMERS: Customer[] = [
  { id: "cu1", name: "Sarah Mitchell",   firstName: "Sarah",   psid: "45218910234", pageId: "p1", pageName: "Royal Gaming Zone", avatar: "SM", color: "#6C63FF", lastActivity: "2 min ago",   status: "eligible", tag: "VIP",      convos: 12, joined: "Jun 12, 2025" },
  { id: "cu2", name: "Daniel Carter",    firstName: "Daniel",  psid: "38920174856", pageId: "p2", pageName: "Elite Cashouts",    avatar: "DC", color: "#22D3EE", lastActivity: "14 min ago",  status: "eligible", tag: "Lead",     convos:  3, joined: "Jul 4, 2025"  },
  { id: "cu3", name: "Emily Johnson",    firstName: "Emily",   psid: "61038291750", pageId: "p1", pageName: "Royal Gaming Zone", avatar: "EJ", color: "#10B981", lastActivity: "1 hour ago",  status: "eligible", tag: "Customer", convos:  7, joined: "May 28, 2025" },
  { id: "cu4", name: "Michael Anderson", firstName: "Michael", psid: "29301847562", pageId: "p3", pageName: "Lucky Looters",     avatar: "MA", color: "#F59E0B", lastActivity: "3 hours ago", status: "recent",   tag: "Customer", convos:  5, joined: "Jul 19, 2025" },
  { id: "cu5", name: "Sophia Williams",  firstName: "Sophia",  psid: "74829103847", pageId: "p1", pageName: "Royal Gaming Zone", avatar: "SW", color: "#EC4899", lastActivity: "1 day ago",   status: "recent",   tag: "VIP",      convos: 18, joined: "Apr 3, 2025"  },
  { id: "cu6", name: "James Wilson",     firstName: "James",   psid: "83019274650", pageId: "p2", pageName: "Elite Cashouts",    avatar: "JW", color: "#8B85FF", lastActivity: "3 days ago",  status: "inactive", tag: "Customer", convos:  2, joined: "Jun 30, 2025" },
  { id: "cu7", name: "Ava Thompson",     firstName: "Ava",     psid: "12938475628", pageId: "p3", pageName: "Lucky Looters",     avatar: "AT", color: "#F97316", lastActivity: "5 days ago",  status: "inactive", tag: "Lead",     convos:  1, joined: "Jul 25, 2025" },
  { id: "cu8", name: "Liam Martinez",    firstName: "Liam",    psid: "56473829104", pageId: "p1", pageName: "Royal Gaming Zone", avatar: "LM", color: "#14B8A6", lastActivity: "1 week ago",  status: "inactive", tag: "Customer", convos:  4, joined: "May 14, 2025" },
];

// ── Conversations ─────────────────────────────────────────────────────────────

export const DEMO_CONVERSATIONS: Conversation[] = [
  {
    id: "cv1", customerId: "cu1", customerName: "Sarah Mitchell", avatar: "SM", color: "#6C63FF",
    pageId: "p1", pageName: "Royal Gaming Zone",
    lastMessage: "Hi! I wanted to ask about the new tournament.", time: "2m", unread: 2, status: "open",
    messages: [
      { id: "m1", role: "customer", text: "Hi! I wanted to ask about the new tournament happening this weekend.", time: "10:41 AM" },
      { id: "m2", role: "agent",    text: "Hi Sarah! Thanks for reaching out. The tournament starts Saturday at 8 PM. Registration is open until Friday midnight.", time: "10:43 AM" },
      { id: "m3", role: "customer", text: "That sounds great. How do I sign up?", time: "10:44 AM" },
    ],
  },
  {
    id: "cv2", customerId: "cu2", customerName: "Daniel Carter", avatar: "DC", color: "#22D3EE",
    pageId: "p2", pageName: "Elite Cashouts",
    lastMessage: "Can I get more details on the payout?", time: "14m", unread: 0, status: "open",
    messages: [
      { id: "m1", role: "customer", text: "Can I get more details on the payout schedule?", time: "10:28 AM" },
      { id: "m2", role: "agent",    text: "Hi Daniel! Payouts are processed every Monday and Thursday. Minimum withdrawal is $50.", time: "10:30 AM" },
      { id: "m3", role: "customer", text: "Perfect, thank you for the quick reply.", time: "10:31 AM" },
    ],
  },
  {
    id: "cv3", customerId: "cu3", customerName: "Emily Johnson", avatar: "EJ", color: "#10B981",
    pageId: "p1", pageName: "Royal Gaming Zone",
    lastMessage: "The event was amazing, thank you!", time: "1h", unread: 0, status: "closed",
    messages: [
      { id: "m1", role: "customer", text: "The event was absolutely amazing, thank you for organizing it!", time: "9:15 AM" },
      { id: "m2", role: "agent",    text: "So glad you enjoyed it Emily! Stay tuned for the next one.", time: "9:17 AM" },
    ],
  },
  {
    id: "cv4", customerId: "cu4", customerName: "Michael Anderson", avatar: "MA", color: "#F59E0B",
    pageId: "p3", pageName: "Lucky Looters",
    lastMessage: "Do you have a referral program?", time: "2h", unread: 1, status: "open",
    messages: [
      { id: "m1", role: "customer", text: "Do you have a referral program where I can earn extra rewards?", time: "8:30 AM" },
    ],
  },
  {
    id: "cv5", customerId: "cu5", customerName: "Sophia Williams", avatar: "SW", color: "#EC4899",
    pageId: "p1", pageName: "Royal Gaming Zone",
    lastMessage: "Thanks for resolving my issue quickly!", time: "3h", unread: 0, status: "closed",
    messages: [
      { id: "m1", role: "customer", text: "Thanks for resolving my account issue so quickly!", time: "7:45 AM" },
      { id: "m2", role: "agent",    text: "Happy to help, Sophia! Let us know if anything else comes up.", time: "7:47 AM" },
    ],
  },
];

// ── Templates ─────────────────────────────────────────────────────────────────

export const DEMO_TEMPLATES: Template[] = [
  { id: "t1", name: "Welcome Message",    category: "Greeting",   body: "Hi {{first_name}}, welcome to {{page_name}}! How can we help you today?",                        updatedAt: "Aug 1, 2025",  usageCount: 248 },
  { id: "t2", name: "Customer Follow-up", category: "Follow-up",  body: "Hi {{first_name}}, just checking in! Is there anything we can help you with today?",              updatedAt: "Jul 28, 2025", usageCount: 94  },
  { id: "t3", name: "Order Update",       category: "Support",    body: "Hi {{first_name}}, your request is being processed. We'll update you shortly. Thanks for your patience!", updatedAt: "Jul 20, 2025", usageCount: 61  },
  { id: "t4", name: "Support Response",   category: "Support",    body: "Thanks for reaching out, {{first_name}}. Our team is looking into your issue and will respond shortly.", updatedAt: "Jul 15, 2025", usageCount: 179 },
];

// ── Broadcasts ────────────────────────────────────────────────────────────────

export const DEMO_BROADCASTS: Broadcast[] = [
  { id: "b1", name: "Weekend Tournament Alert", pageId: "p1", pageName: "Royal Gaming Zone", status: "completed", audience: 843, sent: 843, opened: 512, createdAt: "Aug 1, 2025" },
  { id: "b2", name: "New Payout Rates",         pageId: "p2", pageName: "Elite Cashouts",    status: "scheduled", audience: 430, sent: 0, opened: 0, createdAt: "Aug 5, 2025", scheduledAt: "Aug 12, 2025" },
  { id: "b3", name: "Welcome to Lucky Looters", pageId: "p3", pageName: "Lucky Looters",     status: "draft",     audience: 0,   sent: 0, opened: 0, createdAt: "Aug 7, 2025" },
];

// ── Groups ────────────────────────────────────────────────────────────────────

export const DEMO_GROUPS: Group[] = [
  { id: "g1", name: "New Customers",          description: "Joined in the last 30 days",   count: 312, updatedAt: "Aug 8, 2025", color: "#6C63FF" },
  { id: "g2", name: "VIP Customers",          description: "High-activity, loyal audience", count: 89,  updatedAt: "Aug 7, 2025", color: "#F59E0B" },
  { id: "g3", name: "Recent Conversations",   description: "Active in the last 7 days",     count: 247, updatedAt: "Aug 8, 2025", color: "#10B981" },
  { id: "g4", name: "Follow-up Required",     description: "Awaiting a team response",      count: 43,  updatedAt: "Aug 8, 2025", color: "#EC4899" },
];

// ── Notifications ─────────────────────────────────────────────────────────────

export const DEMO_NOTIFICATIONS: Notification[] = [
  { id: "n1", type: "conversation", title: "New conversation",   body: "Sarah Mitchell sent a new message on Royal Gaming Zone.", time: "2 min ago",  read: false },
  { id: "n2", type: "broadcast",    title: "Broadcast completed", body: "Weekend Tournament Alert was sent to 843 recipients.",   time: "1 hour ago", read: false },
  { id: "n3", type: "template",     title: "Template created",   body: "Support Response template was saved successfully.",       time: "3 hours ago",read: true  },
  { id: "n4", type: "page",         title: "Page synced",        body: "Lucky Looters synced 12 new conversations.",              time: "5 hours ago",read: true  },
  { id: "n5", type: "group",        title: "Group updated",      body: "Follow-up Required group has 43 customers.",             time: "1 day ago",  read: true  },
];

// ── Analytics ─────────────────────────────────────────────────────────────────

export const ANALYTICS_7D: AnalyticsPoint[] = [
  { label: "Mon", conversations: 45, responses: 38, audience: 2401 },
  { label: "Tue", conversations: 72, responses: 61, audience: 2418 },
  { label: "Wed", conversations: 58, responses: 52, audience: 2435 },
  { label: "Thu", conversations: 89, responses: 78, audience: 2452 },
  { label: "Fri", conversations: 63, responses: 57, audience: 2468 },
  { label: "Sat", conversations: 34, responses: 29, audience: 2475 },
  { label: "Sun", conversations: 27, responses: 22, audience: 2481 },
];

export const ANALYTICS_30D: AnalyticsPoint[] = [
  { label: "W1", conversations: 312, responses: 271, audience: 2280 },
  { label: "W2", conversations: 287, responses: 248, audience: 2347 },
  { label: "W3", conversations: 341, responses: 299, audience: 2412 },
  { label: "W4", conversations: 388, responses: 335, audience: 2481 },
];

export const ANALYTICS_90D: AnalyticsPoint[] = [
  { label: "Jun", conversations: 847, responses: 730, audience: 1980 },
  { label: "Jul", conversations: 1124, responses: 984, audience: 2280 },
  { label: "Aug", conversations: 328, responses: 277, audience: 2481 },
];

// ── Summary stats ─────────────────────────────────────────────────────────────

export const SUMMARY = {
  connectedPages: 3,
  activeConversations: 128,
  totalAudience: 2481,
  eligibleRecipients: 1842,
  credits: 18450,
  usedCreditsThisMonth: 4320,
  creditPlanLimit: 25000,
};
