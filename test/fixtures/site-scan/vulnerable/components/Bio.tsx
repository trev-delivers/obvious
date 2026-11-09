"use client";
export function Bio({ bio }) {
  return <div dangerouslySetInnerHTML={{ __html: bio }} />;
}
