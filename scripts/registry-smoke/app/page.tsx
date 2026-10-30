"use client";

/* Uses every registry item, so a broken import or prop type fails tsc. */
import Sheet from "@/components/obvious/Sheet";
import { Toasts, useToasts } from "@/components/obvious/Toasts";
import GradualBlur from "@/components/obvious/GradualBlur";
import PlusMenu from "@/components/obvious/PlusMenu";
import {
  Tabs, Badge, AnimatedNumber, TextSwap, SuccessCheck, Switch, Checkbox, SearchField, IconSwap, DotLoader, Odometer,
  Toggle, Check, Reel, Matrix, PopNumber,
} from "@/components/obvious/motion";
import {
  HoloSurface, Holo, Guilloche, EncryptedText, GlowText, BorderLight, GlowCursor, useGyroPermission, seal,
} from "@/components/obvious/effects";

export default function Page() {
  const { list, toast, dismiss } = useToasts();
  const gyro = useGyroPermission();
  const s = seal("guest", { rings: 4 });
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
      <GradualBlur edge="top" size="3rem" strength="strong" layers={5} fade position="sticky" always />
      <GlowCursor />
      <HoloSurface className="card" tilt={6}>
        <Guilloche seed="guest|2026-11-02" />
        <Guilloche seed="guest" variant="field" />
        <Holo paths={s.rings} viewBox={s.viewBox} />
        <Holo viewBox="0 0 64 64"><path d="M2 32h60" stroke="black" /></Holo>
        <GlowText as="h1">Welcome in</GlowText>
        <EncryptedText text="Valid to Sun 2 Nov" />
      </HoloSurface>
      {gyro.needed && <button onClick={gyro.ask}>Tilt to see the hologram</button>}
      <BorderLight radius="var(--ob-button-radius)"><button>Let yourself in</button></BorderLight>
      <div data-fx-rim>Wifi</div>
      <Sheet title="Sheet" onClose={() => {}}>{(close) => <button onClick={() => close()}>Done</button>}</Sheet>
    </main>
  );
}
