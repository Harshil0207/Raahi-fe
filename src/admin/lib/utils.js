/**
 * One line, on purpose.
 *
 * `cn` lives in `shared/` so the two apps cannot drift on it. This file stays
 * because 91 components across the two apps import `@/lib/utils`, and pointing
 * all of them somewhere new would be a large diff for a 128-byte function.
 * Opening this file tells you where the real one is, which an alias quietly
 * rewriting the path would not.
 */
export * from "@/lib/utils";
