import { blogPosts } from "./blog.generated";

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
    }
  | {
      type: "image";
      url: string;
      alt: string;
      caption?: string;
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
