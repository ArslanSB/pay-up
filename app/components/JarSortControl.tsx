import { Form, useNavigation } from "react-router";
import { JAR_SORT_LABELS, JAR_SORTS, type JarSort } from "../lib/jar-sort";

/**
 * Three orders in one strip; the chosen one is inked like the Settle button. Each option is a submit
 * button, so it works before JavaScript loads; with it, the tiles slide to their new places.
 */
export function JarSortControl({ current }: { current: JarSort }) {
  const navigation = useNavigation();
  // Show the new choice while the server saves it.
  const pending = navigation.formData?.get("intent") === "sort" ? navigation.formData.get("sort") : null;
  const selected = pending ?? current;
  return (
    <Form method="post" viewTransition preventScrollReset className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm font-semibold">
      <input type="hidden" name="intent" value="sort" />
      <span id="jar-sort-label">Sort</span>
      <div role="group" aria-labelledby="jar-sort-label" className="flex border-3 border-ink bg-white shadow-[3px_3px_0_#000]">
        {JAR_SORTS.map((sort, i) => (
          <button
            key={sort}
            type="submit"
            name="sort"
            value={sort}
            aria-pressed={sort === selected}
            className={`min-h-10 whitespace-nowrap px-2.5 font-bold focus-visible:outline-offset-[-6px] ${i > 0 ? "border-l-3 border-ink" : ""} ${sort === selected ? "bg-ink text-yellow" : "hover:bg-yellow"}`}
          >
            {JAR_SORT_LABELS[sort]}
          </button>
        ))}
      </div>
    </Form>
  );
}
