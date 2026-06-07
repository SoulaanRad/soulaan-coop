import type { Metadata } from "next";
import { ArrowLeft, Clock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BlogCard } from "@/components/blog/blog-card";
import { BlogComments } from "@/components/blog/comments";
import { SiteShell } from "@/components/blog/site-shell";
import {
  formatPostDate,
  getBlogPost,
  getPublishedBlogPosts,
} from "@/lib/blog";
import type { BlogPostBlock } from "@/lib/blog";

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getPublishedBlogPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);

  if (!post) {
    return {
      title: "Blog post not found | Cahootz",
    };
  }

  return {
    title: `${post.title} | Cahootz`,
    description: post.description,
    alternates: {
      canonical: `https://cahootz.coop/blog/${post.slug}`,
    },
    openGraph: {
      type: "article",
      url: `https://cahootz.coop/blog/${post.slug}`,
      title: post.title,
      description: post.description,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt ?? post.publishedAt,
      authors: [post.author],
      tags: post.tags,
      images: [
        {
          url: post.image.startsWith("http") ? post.image : `https://cahootz.coop${post.image}`,
          alt: post.imageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: [post.image.startsWith("http") ? post.image : `https://cahootz.coop${post.image}`],
    },
  };
}

function BlogBlock({ block }: { block: BlogPostBlock }) {
  if (block.type === "heading") {
    return (
      <h2 
        className="mt-10 text-2xl font-black tracking-tight text-white md:text-3xl"
        dangerouslySetInnerHTML={{ __html: block.text }}
      />
    );
  }

  if (block.type === "list") {
    return (
      <ul className="mt-5 space-y-3">
        {block.items.map((item, idx) => (
          <li key={idx} className="flex gap-3 text-slate-300">
            <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-[#facc15]" />
            <span className="leading-8" dangerouslySetInnerHTML={{ __html: item }} />
          </li>
        ))}
      </ul>
    );
  }

  if (block.type === "quote") {
    return (
      <blockquote 
        className="mt-8 border-l-4 border-[#f59e0b] bg-white/[0.04] px-5 py-4 text-xl font-semibold leading-9 text-white"
        dangerouslySetInnerHTML={{ __html: block.text }}
      />
    );
  }

  if (block.type === "image") {
    return (
      <figure className="mt-8">
        <div className="overflow-hidden rounded-lg border border-white/10 bg-[#1b1b1b]">
          {/* Body images have unknown intrinsic dimensions, so render at natural aspect ratio. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={block.url}
            alt={block.alt}
            loading="lazy"
            className="h-auto w-full"
          />
        </div>
        {block.caption ? (
          <figcaption className="mt-3 text-center text-sm text-slate-400">
            {block.caption}
          </figcaption>
        ) : null}
      </figure>
    );
  }

  return (
    <p 
      className="mt-5 leading-8 text-slate-300" 
      dangerouslySetInnerHTML={{ __html: block.text }} 
    />
  );
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = getBlogPost(slug);

  if (!post) {
    notFound();
  }

  const relatedPosts = getPublishedBlogPosts()
    .filter((item) => item.slug !== post.slug)
    .slice(0, 2);

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt ?? post.publishedAt,
    author: {
      "@type": "Organization",
      name: post.author,
    },
    publisher: {
      "@type": "Organization",
      name: "Cahootz",
      logo: {
        "@type": "ImageObject",
        url: "https://cahootz.coop/placeholder-logo.png",
      },
    },
    mainEntityOfPage: `https://cahootz.coop/blog/${post.slug}`,
  };

  return (
    <SiteShell>
      <main>
        <article>
          <section className="border-b border-white/10 px-5 py-12 sm:px-6 md:py-16">
            <div className="mx-auto max-w-4xl">
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 transition hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Blog
              </Link>

              <div className="mt-8 flex flex-wrap items-center gap-3 text-sm text-slate-400">
                <span className="rounded-md border border-[#f59e0b]/25 bg-[#f59e0b]/10 px-3 py-1 font-bold uppercase tracking-widest text-[#facc15]">
                  {post.category}
                </span>
                <span>{formatPostDate(post.publishedAt)}</span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {post.readingTime}
                </span>
              </div>

              <h1 className="mt-6 text-4xl font-black tracking-tight md:text-6xl">
                {post.title}
              </h1>
              <p className="mt-6 text-xl leading-9 text-slate-300">
                {post.excerpt}
              </p>
            </div>
          </section>

          <div className="relative aspect-[16/7] min-h-72 border-b border-white/10 bg-[#1b1b1b]">
            <Image
              src={post.image}
              alt={post.imageAlt}
              fill
              className="object-cover opacity-85"
              sizes="100vw"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#111111]/45 to-transparent" />
          </div>

          <section className="px-5 py-12 sm:px-6 md:py-16">
            <div className="mx-auto max-w-3xl text-lg">
              {post.blocks.map((block, index) => (
                <BlogBlock key={`${block.type}-${index}`} block={block} />
              ))}
            </div>
          </section>

          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
          />
        </article>

        <BlogComments
          slug={post.slug}
          url={`https://cahootz.coop/blog/${post.slug}`}
          title={post.title}
        />

        {relatedPosts.length > 0 && (
          <section className="border-t border-white/10 bg-[#161616] px-5 py-16 sm:px-6 md:py-20">
            <div className="mx-auto max-w-7xl">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <div>
                  <p className="text-sm font-bold uppercase tracking-widest text-[#facc15]">
                    Keep reading
                  </p>
                  <h2 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
                    More from Cahootz.
                  </h2>
                </div>
                <Link
                  href="/blog"
                  className="inline-flex items-center gap-2 text-sm font-bold text-[#facc15] transition hover:text-white"
                >
                  All posts
                </Link>
              </div>

              <div className="mt-10 grid gap-5 md:grid-cols-2">
                {relatedPosts.map((relatedPost) => (
                  <BlogCard key={relatedPost.slug} post={relatedPost} />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </SiteShell>
  );
}
