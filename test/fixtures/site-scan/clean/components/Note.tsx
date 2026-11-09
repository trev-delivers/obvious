"use client";
export function Note() {
  return <p dangerouslySetInnerHTML={{ __html: "<b>Hello</b>" }} />;
}
