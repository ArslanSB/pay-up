/** Dashboard orders. Shared by the server query and the sort control. */
export const JAR_SORTS = ["newest", "recent", "owed"] as const;
export type JarSort = (typeof JAR_SORTS)[number];

export const JAR_SORT_LABELS: Record<JarSort, string> = {
  newest: "Newest",
  recent: "Recently fined",
  owed: "Most owed",
};

export function isJarSort(value: unknown): value is JarSort {
  return (JAR_SORTS as readonly unknown[]).includes(value);
}
