import { useEffect } from "react";

/**
 * Dynamically sets the document <title> and <meta name="description"> for SEO.
 * Call at the top of each page component.
 */
export function usePageMeta(title: string, description: string) {
  useEffect(() => {
    // Set page title
    document.title = title;

    // Set or create meta description
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (meta) {
      meta.setAttribute("content", description);
    } else {
      meta = document.createElement("meta");
      meta.name = "description";
      meta.content = description;
      document.head.appendChild(meta);
    }

    // Update Open Graph title & description
    const ogTitle = document.querySelector('meta[property="og:title"]') as HTMLMetaElement | null;
    if (ogTitle) ogTitle.setAttribute("content", title);

    const ogDesc = document.querySelector('meta[property="og:description"]') as HTMLMetaElement | null;
    if (ogDesc) ogDesc.setAttribute("content", description);
  }, [title, description]);
}
