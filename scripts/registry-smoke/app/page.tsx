"use client";

/* Uses every registry item, so a broken import or prop type fails tsc. */
import Sheet from "@/components/obvious/Sheet";
import { Toasts, useToasts } from "@/components/obvious/Toasts";
import PlusMenu from "@/components/obvious/PlusMenu";
import {
  Tabs, Badge, AnimatedNumber, TextSwap, SuccessCheck, Switch, Checkbox, SearchField, IconSwap, DotLoader, Odometer,
  Toggle, Check, Reel, Matrix, PopNumber,
} from "@/components/obvious/motion";

export default function Page() {
  const { list, toast, dismiss } = useToasts();
  return (
    <main>
      <Tabs label="t" value="a" onChange={() => {}} options={[{ value: "a", label: "A" }]} />
      <Badge count={2} />
      <AnimatedNumber value={4} />
      <TextSwap text="Saved" />
      <SuccessCheck />
      <Switch on onChange={() => {}} label="switch" />
      <Checkbox checked onChange={() => {}} label="checkbox" />
      <SearchField value="" onChange={() => {}} placeholder="Search" label="search" />
      <IconSwap state="a" />
      <DotLoader variant="scan" />
      <Odometer value={3} />
      {/* The old names still work. */}
      <Toggle on onChange={() => {}} label="toggle" />
      <Check checked onChange={() => {}} label="check" />
      <Reel value={3} />
      <Matrix />
      <PopNumber value={1} />
      <PlusMenu items={[{ label: "New", icon: null, onSelect: () => toast("Saved") }]} />
      <Toasts list={list} dismiss={dismiss} />
      <Sheet title="Sheet" onClose={() => {}}>{(close) => <button onClick={() => close()}>Done</button>}</Sheet>
    </main>
  );
}
