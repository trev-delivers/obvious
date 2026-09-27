"use client";

/* Uses every registry item, so a broken import or prop type fails tsc. */
import Sheet from "@/components/obvious/Sheet";
import { Toasts, useToasts } from "@/components/obvious/Toasts";
import PlusMenu from "@/components/obvious/PlusMenu";
import { Tabs, Toggle, Check, SearchField, Reel } from "@/components/obvious/motion";

export default function Page() {
  const { list, toast, dismiss } = useToasts();
  return (
    <main>
      <Tabs label="t" value="a" onChange={() => {}} options={[{ value: "a", label: "A" }]} />
      <Toggle on onChange={() => {}} label="toggle" />
      <Check checked onChange={() => {}} label="check" />
      <SearchField value="" onChange={() => {}} placeholder="Search" label="search" />
      <Reel value={3} />
      <PlusMenu items={[{ label: "New", icon: null, onSelect: () => toast("Saved") }]} />
      <Toasts list={list} dismiss={dismiss} />
      <Sheet title="Sheet" onClose={() => {}}>{(close) => <button onClick={() => close()}>Done</button>}</Sheet>
    </main>
  );
}
