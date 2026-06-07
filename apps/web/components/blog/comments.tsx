"use client";

import { useEffect, useRef } from "react";

import { env } from "@/env";

interface BlogCommentsProps {
  /** Stable, unique identifier for the post (slug). Keeps threads tied to a post even if the URL changes. */
  slug: string;
  /** Canonical URL of the post. */
  url: string;
  /** Post title, shown by Disqus when creating the thread. */
  title: string;
}

declare global {
  interface Window {
    DISQUS?: {
      reset: (config: {
        reload: boolean;
        config: (this: DisqusConfigThis) => void;
      }) => void;
    };
    disqus_config?: (this: DisqusConfigThis) => void;
  }
}

interface DisqusConfigThis {
  page: { identifier: string; url: string; title: string };
}

export function BlogComments({ slug, url, title }: BlogCommentsProps) {
  const shortname = env.NEXT_PUBLIC_DISQUS_SHORTNAME;
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!shortname) return;

    const configure = function (this: DisqusConfigThis) {
      this.page.identifier = slug;
      this.page.url = url;
      this.page.title = title;
    };

    // If Disqus is already on the page (client-side navigation), reset the
    // thread for the new post instead of injecting the script again.
    if (window.DISQUS) {
      window.DISQUS.reset({ reload: true, config: configure });
      return;
    }

    window.disqus_config = configure;

    const script = document.createElement("script");
    script.src = `https://${shortname}.disqus.com/embed.js`;
    script.setAttribute("data-timestamp", String(Date.now()));
    script.async = true;
    document.body.appendChild(script);
    loadedRef.current = true;

    return () => {
      if (loadedRef.current) {
        script.remove();
      }
    };
  }, [shortname, slug, url, title]);

  if (!shortname) return null;

  return (
    <section className="border-t border-white/10 px-5 py-12 sm:px-6 md:py-16">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-2xl font-black tracking-tight text-white md:text-3xl">
          Comments
        </h2>
        <p className="mt-2 text-slate-400">
          Join the conversation. Sign in with Google, email, or as a guest.
        </p>
        <div id="disqus_thread" className="mt-8" />
      </div>
    </section>
  );
}
