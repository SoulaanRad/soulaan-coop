export type BlogPostBlock =
  | {
      type: "paragraph";
      text: string;
    }
  | {
      type: "heading";
      text: string;
    }
  | {
      type: "list";
      items: string[];
    }
  | {
      type: "quote";
      text: string;
    };

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  excerpt: string;
  publishedAt: string;
  updatedAt?: string;
  author: string;
  category: string;
  readingTime: string;
  image: string;
  imageAlt: string;
  featured?: boolean;
  tags: string[];
  blocks: BlogPostBlock[];
}

export function blocksFromNotionPaste(markdown: string): BlogPostBlock[] {
  const blocks: BlogPostBlock[] = [];
  const lines = markdown.trim().split(/\r?\n/);

  let paragraph: string[] = [];
  let listItems: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ type: "paragraph", text: paragraph.join(" ") });
      paragraph = [];
    }
  };

  const flushList = () => {
    if (listItems.length > 0) {
      blocks.push({ type: "list", items: listItems });
      listItems = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    if (line.startsWith("#")) {
      flushParagraph();
      flushList();
      blocks.push({ type: "heading", text: line.replace(/^#+\s*/, "") });
      continue;
    }

    if (line.startsWith(">")) {
      flushParagraph();
      flushList();
      blocks.push({ type: "quote", text: line.replace(/^>\s*/, "") });
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      flushParagraph();
      listItems.push(line.replace(/^[-*]\s+/, ""));
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();

  return blocks;
}

export const blogPosts: BlogPost[] = [
  {
    slug: "why-community-owned-economies-need-better-software",
    title: "Why community-owned economies need better software",
    description:
      "A practical look at why co-ops, local networks, and member-owned communities need modern tools for trust, spending, and governance.",
    excerpt:
      "Cooperative work already has the ambition of a startup. It deserves software that makes joining, spending, deciding, and building feel connected.",
    publishedAt: "2026-05-19",
    author: "Cahootz Team",
    category: "Company",
    readingTime: "4 min read",
    image: "/images/soulaan-flag.jpg",
    imageAlt: "The Soulaan flag as a visual marker for community ownership.",
    featured: true,
    tags: ["cooperative economy", "community wealth", "product"],
    blocks: [
      {
        type: "paragraph",
        text: "Most community-led economic work is forced to stitch together forms, spreadsheets, chats, payment links, and meetings. The people doing the work are serious, but the system around them often feels temporary.",
      },
      {
        type: "paragraph",
        text: "Cahootz is built from a different assumption: a co-op is not just a group chat with dues. It is a living economy with members, businesses, proposals, purchases, rewards, and public trust moving at the same time.",
      },
      {
        type: "heading",
        text: "The missing layer is coordination",
      },
      {
        type: "paragraph",
        text: "When a community can see where to join, where to spend, what decisions are active, and what the treasury is funding, participation gets easier. Software should reduce the distance between interest and action.",
      },
      {
        type: "list",
        items: [
          "Members need a clear path to join and participate.",
          "Businesses need discovery, trust, and repeat support.",
          "Co-ops need governance that people can understand before they vote.",
          "Communities need public pages that explain what is happening without extra admin work.",
        ],
      },
      {
        type: "quote",
        text: "The goal is not to make community work feel corporate. The goal is to make ownership easier to practice.",
      },
      {
        type: "heading",
        text: "What we are building toward",
      },
      {
        type: "paragraph",
        text: "The first version of Cahootz connects applications, local commerce, proposals, membership, and rewards. Over time, the same foundation can help communities fund vendors, publish updates, and build the tools their members actually ask for.",
      },
    ],
  },
  {
    slug: "how-a-coop-can-fund-new-tools-through-proposals",
    title: "How a co-op can fund new tools through proposals",
    description:
      "A simple model for using member proposals to fund vendors, software, events, and services that help the co-op grow.",
    excerpt:
      "A co-op can operate like a member-owned startup when proposals connect real needs, transparent budgets, and visible follow-through.",
    publishedAt: "2026-05-16",
    author: "Cahootz Team",
    category: "Governance",
    readingTime: "3 min read",
    image: "/placeholder.jpg",
    imageAlt: "Abstract workspace placeholder for a member-funded project update.",
    tags: ["governance", "proposals", "vendors"],
    blocks: [
      {
        type: "paragraph",
        text: "A proposal is more than a vote. Done well, it is a lightweight operating system for deciding what the community should build, fund, or try next.",
      },
      {
        type: "heading",
        text: "Start with a concrete need",
      },
      {
        type: "paragraph",
        text: "The best proposals name a specific problem, the people affected, the requested budget, and what success will look like. That gives members something real to evaluate instead of a vague idea to approve.",
      },
      {
        type: "list",
        items: [
          "What problem are we solving?",
          "Who will do the work?",
          "How much should the co-op fund?",
          "How will members know it worked?",
        ],
      },
      {
        type: "paragraph",
        text: "Cahootz is designed to make that reasoning visible. Members can discuss tradeoffs, review alignment with the co-op rules, and vote with more context.",
      },
    ],
  },
  {
    slug: "writing-updates-your-community-will-actually-read",
    title: "Writing updates your community will actually read",
    description:
      "A short publishing framework for turning Notion drafts into useful public updates for members, businesses, and supporters.",
    excerpt:
      "Good community updates are clear, specific, and useful. Draft them in Notion, then publish them where your members already learn about the network.",
    publishedAt: "2026-05-12",
    author: "Cahootz Team",
    category: "Publishing",
    readingTime: "3 min read",
    image: "/placeholder-logo.png",
    imageAlt: "Cahootz logo placeholder used for a publishing workflow post.",
    tags: ["notion", "blog", "community"],
    blocks: blocksFromNotionPaste(`
Notion is a great place to draft because it keeps messy thinking comfortable. The public blog should be where the finished version lives, with clean URLs, sharing previews, and search visibility.

## A useful post has one job

Before publishing, decide whether the post is announcing, explaining, inviting, or documenting. If it tries to do all four, readers will feel the drag.

- Use the title to say what changed or what the reader will learn.
- Put the plain-language summary near the top.
- Break long Notion sections into short article sections.
- End with the next meaningful action, not a pile of links.

For now, Cahootz posts can be drafted in Notion and pasted into the blog content file. Later, this can become a small internal editor or a Notion API sync.
`),
  },
];

export function getPublishedBlogPosts() {
  return [...blogPosts].sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}

export function getFeaturedBlogPosts(limit = 3) {
  const posts = getPublishedBlogPosts();
  const featured = posts.filter((post) => post.featured);
  const rest = posts.filter((post) => !post.featured);

  return [...featured, ...rest].slice(0, limit);
}

export function getBlogPost(slug: string) {
  return blogPosts.find((post) => post.slug === slug);
}

export function formatPostDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
}
