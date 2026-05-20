import { config as loadDotenv } from "dotenv";
import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { BlogPost, BlogPostBlock } from "../lib/blog";

const NOTION_VERSION = "2025-09-03";
const DEFAULT_AUTHOR = "Cahootz Team";
const DEFAULT_CATEGORY = "Publishing";
const DEFAULT_IMAGE = "/placeholder.jpg";
const DEFAULT_IMAGE_ALT = "Cahootz blog post image.";

interface NotionRichText {
  plain_text?: string;
}
interface NotionOption {
  name?: string;
}
interface NotionFile {
  file?: { url?: string };
  external?: { url?: string };
}
interface NotionProperty {
  type: string;
  title?: NotionRichText[];
  rich_text?: NotionRichText[];
  select?: NotionOption | null;
  multi_select?: NotionOption[];
  status?: NotionOption | null;
  date?: { start?: string | null } | null;
  checkbox?: boolean;
  url?: string | null;
  people?: { name?: string }[];
  files?: NotionFile[];
  created_time?: string;
  last_edited_time?: string;
}
interface NotionPage {
  id: string;
  created_time: string;
  last_edited_time: string;
  cover?: NotionFile | null;
  properties: Record<string, NotionProperty>;
  archived?: boolean;
  is_archived?: boolean;
  in_trash?: boolean;
}
interface NotionBlock {
  id: string;
  type: string;
  has_children?: boolean;
  paragraph?: { rich_text?: NotionRichText[] };
  heading_1?: { rich_text?: NotionRichText[] };
  heading_2?: { rich_text?: NotionRichText[] };
  heading_3?: { rich_text?: NotionRichText[] };
  quote?: { rich_text?: NotionRichText[] };
  bulleted_list_item?: { rich_text?: NotionRichText[] };
  numbered_list_item?: { rich_text?: NotionRichText[] };
}

const scriptDir = dirname(fileURLToPath(import.meta.url));
const webDir = resolve(scriptDir, "..");
const repoDir = resolve(webDir, "../..");

loadDotenv({ path: resolve(repoDir, ".env") });
loadDotenv({ path: resolve(webDir, ".env"), override: true });
loadDotenv({ path: resolve(webDir, ".env.local"), override: true });

const { env } = await import("../env");
const token = env.NOTION_TOKEN;
const databaseId = env.NOTION_BLOG_DATABASE_ID;

if (!token || !databaseId) {
  throw new Error(
    "Missing NOTION_TOKEN or NOTION_BLOG_DATABASE_ID. Add them to apps/web/.env.local or the repo .env file.",
  );
}

async function notionFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`https://api.notion.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_VERSION,
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Notion request failed (${response.status} ${response.statusText}): ${body}`);
  }

  return response.json() as Promise<T>;
}

function plainText(richText?: NotionRichText[]): string {
  return richText?.map((text) => text.plain_text ?? "").join("").trim() ?? "";
}

function property(
  properties: Record<string, NotionProperty>,
  names: string[],
): NotionProperty | undefined {
  const entries = Object.entries(properties);
  for (const name of names) {
    const exact = properties[name];
    if (exact) return exact;

    const normalized = name.toLowerCase().replace(/\s+/g, "");
    const found = entries.find(
      ([key]) => key.toLowerCase().replace(/\s+/g, "") === normalized,
    );
    if (found) return found[1];
  }
}

function textProperty(properties: Record<string, NotionProperty>, names: string[]): string {
  const prop = property(properties, names);
  if (!prop) return "";

  if (prop.type === "title") return plainText(prop.title);
  if (prop.type === "rich_text") return plainText(prop.rich_text);
  if (prop.type === "select") return prop.select?.name ?? "";
  if (prop.type === "status") return prop.status?.name ?? "";
  if (prop.type === "url") return prop.url ?? "";
  if (prop.type === "people") return prop.people?.map((person) => person.name).filter(Boolean).join(", ") ?? "";
  if (prop.type === "created_time") return prop.created_time ?? "";
  if (prop.type === "last_edited_time") return prop.last_edited_time ?? "";

  return "";
}

function dateProperty(properties: Record<string, NotionProperty>, names: string[]): string {
  const prop = property(properties, names);
  return prop?.type === "date" ? (prop.date?.start ?? "") : "";
}

function checkboxProperty(
  properties: Record<string, NotionProperty>,
  names: string[],
): boolean | undefined {
  const prop = property(properties, names);
  return prop?.type === "checkbox" ? prop.checkbox : undefined;
}

function tagsProperty(properties: Record<string, NotionProperty>): string[] {
  const prop = property(properties, ["Tags", "Tag"]);
  if (!prop) return [];
  if (prop.type === "multi_select") return prop.multi_select?.map((tag) => tag.name ?? "") ?? [];
  if (prop.type === "select") return prop.select?.name ? [prop.select.name] : [];
  return textProperty(properties, ["Tags", "Tag"])
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function imageProperty(page: NotionPage): string {
  const prop = property(page.properties, ["Image", "Cover", "Hero Image", "Image URL"]);
  if (prop?.type === "url" && prop.url) return prop.url;
  if (prop?.type === "files") {
    const file = prop.files?.[0];
    if (file?.external?.url) return file.external.url;
    if (file?.file?.url) return file.file.url;
  }
  if (page.cover?.external?.url) return page.cover.external.url;
  if (page.cover?.file?.url) return page.cover.file.url;
  return DEFAULT_IMAGE;
}

function isPublished(properties: Record<string, NotionProperty>): boolean {
  const checkbox = checkboxProperty(properties, ["Published", "Publish"]);
  if (checkbox !== undefined) return checkbox;

  const status = textProperty(properties, ["Status", "State"]).toLowerCase();
  if (!status) return true;

  return ["published", "live", "public"].includes(status);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function truncate(value: string, length: number): string {
  if (value.length <= length) return value;
  return `${value.slice(0, length - 1).trim()}...`;
}

function blocksFromPlainText(text: string): BlogPostBlock[] {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => ({ type: "paragraph", text: paragraph }));
}

function isoDate(value: string): string {
  if (!value) return new Date().toISOString().slice(0, 10);
  return value.slice(0, 10);
}

function estimateReadingTime(blocks: BlogPostBlock[]): string {
  const words = blocks
    .flatMap((block) => {
      if (block.type === "list") return block.items;
      return [block.text];
    })
    .join(" ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return `${Math.max(1, Math.ceil(words / 200))} min read`;
}

function pushParagraph(blocks: BlogPostBlock[], text: string) {
  if (text) blocks.push({ type: "paragraph", text });
}

async function listPages(): Promise<NotionPage[]> {
  const pages: NotionPage[] = [];
  let cursor: string | undefined;

  do {
    const result = await notionFetch<{
      results: NotionPage[];
      has_more: boolean;
      next_cursor?: string | null;
    }>(`/data_sources/${databaseId}/query`, {
      method: "POST",
      body: JSON.stringify({
        page_size: 100,
        start_cursor: cursor,
      }),
    });

    pages.push(...result.results);
    cursor = result.next_cursor ?? undefined;
  } while (cursor);

  return pages.filter(
    (page) =>
      !page.archived &&
      !page.is_archived &&
      !page.in_trash &&
      isPublished(page.properties),
  );
}

async function listBlocks(pageId: string): Promise<NotionBlock[]> {
  const blocks: NotionBlock[] = [];
  let cursor: string | undefined;

  do {
    const query = new URLSearchParams({ page_size: "100" });
    if (cursor) query.set("start_cursor", cursor);

    const result = await notionFetch<{
      results: NotionBlock[];
      has_more: boolean;
      next_cursor?: string | null;
    }>(`/blocks/${pageId}/children?${query.toString()}`);

    blocks.push(...result.results);
    cursor = result.next_cursor ?? undefined;
  } while (cursor);

  return blocks;
}

function blocksFromNotion(blocks: NotionBlock[]): BlogPostBlock[] {
  const output: BlogPostBlock[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      output.push({ type: "list", items: listItems });
      listItems = [];
    }
  };

  for (const block of blocks) {
    if (block.type !== "bulleted_list_item" && block.type !== "numbered_list_item") {
      flushList();
    }

    switch (block.type) {
      case "paragraph":
        pushParagraph(output, plainText(block.paragraph?.rich_text));
        break;
      case "heading_1":
        output.push({ type: "heading", text: plainText(block.heading_1?.rich_text) });
        break;
      case "heading_2":
        output.push({ type: "heading", text: plainText(block.heading_2?.rich_text) });
        break;
      case "heading_3":
        output.push({ type: "heading", text: plainText(block.heading_3?.rich_text) });
        break;
      case "quote": {
        const text = plainText(block.quote?.rich_text);
        if (text) output.push({ type: "quote", text });
        break;
      }
      case "bulleted_list_item":
        listItems.push(plainText(block.bulleted_list_item?.rich_text));
        break;
      case "numbered_list_item":
        listItems.push(plainText(block.numbered_list_item?.rich_text));
        break;
      default:
        break;
    }
  }

  flushList();
  return output;
}

async function pageToPost(page: NotionPage): Promise<BlogPost> {
  const properties = page.properties;
  const contentBrief = textProperty(properties, ["Content Brief", "Content", "Body"]);
  const childBlocks = blocksFromNotion(await listBlocks(page.id));
  const blocks = childBlocks.length > 0 ? childBlocks : blocksFromPlainText(contentBrief);
  const title = textProperty(properties, ["Title", "Name"]);
  const description =
    textProperty(properties, ["Description", "Summary"]) || truncate(contentBrief, 180);
  const excerpt = textProperty(properties, ["Excerpt"]) || description;
  const publishedAt = isoDate(
    dateProperty(properties, ["Publish Date", "Published At", "Published", "Date"]) ||
      page.created_time,
  );

  return {
    slug: textProperty(properties, ["Slug"]) || slugify(title),
    title,
    description,
    excerpt,
    publishedAt,
    updatedAt: isoDate(dateProperty(properties, ["Last Updated"]) || page.last_edited_time),
    author: textProperty(properties, ["Author"]) || DEFAULT_AUTHOR,
    category: textProperty(properties, ["Category"]) || DEFAULT_CATEGORY,
    readingTime: textProperty(properties, ["Reading Time"]) || estimateReadingTime(blocks),
    image: imageProperty(page),
    imageAlt: textProperty(properties, ["Image Alt", "ImageAlt", "Alt"]) || DEFAULT_IMAGE_ALT,
    featured: checkboxProperty(properties, ["Featured"]) ?? false,
    tags: tagsProperty(properties),
    blocks,
  };
}

const posts = (await Promise.all((await listPages()).map(pageToPost)))
  .filter((post) => post.title && post.slug)
  .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

const generated = `import type { BlogPost } from "./blog";

export const blogPosts: BlogPost[] = ${JSON.stringify(posts, null, 2)};
`;

await writeFile(resolve(webDir, "lib/blog.generated.ts"), generated);

console.log(`Synced ${posts.length} Notion blog post${posts.length === 1 ? "" : "s"}.`);
