import { useCallback, useEffect, useState } from 'react';
import { loadTags, makeTag, putTag } from '../db/repo';
import { seedTags } from '../db/seed';
import type { Tag } from '../db/types';

/**
 * The tag list is open (SPEC §2.6). Warm-up / Principle / Rutina are rows in
 * IndexedDB seeded on first run, never an enum in the source.
 */
export function useTags() {
  const [tags, setTags] = useState<Tag[]>([]);

  useEffect(() => {
    let live = true;
    void seedTags()
      .then(loadTags)
      .then((rows) => {
        if (live) setTags(rows);
      });
    return () => {
      live = false;
    };
  }, []);

  /** Returns the tag, existing or new — so the caller can apply it immediately. */
  const create = useCallback(
    (label: string): Tag | null => {
      const trimmed = label.trim();
      if (!trimmed) return null;
      const tag = makeTag(trimmed);
      const existing = tags.find((t) => t.id === tag.id);
      if (existing) return existing;
      setTags((prev) => [...prev, tag]);
      putTag(tag);
      return tag;
    },
    [tags],
  );

  return { tags, create };
}
