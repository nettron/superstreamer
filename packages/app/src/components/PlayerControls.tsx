import { Button } from "@nextui-org/react";
import cn from "clsx";
import { useRef } from "react";
import { Selection } from "./Selection";
import { usePlayerSelector } from "../context/PlayerContext";
import { useSeekbar } from "../hooks/useSeekbar";
import type { ReactNode, RefObject } from "react";

export function PlayerControls() {
  return (
    <div className="flex flex-col gap-4 overflow-hidden">
      <div className="flex justify-center">
        <PlayButton />
      </div>
      <div className="p-3 rounded-md bg-default-100">
        <Time />
        <Seekbar />
      </div>
      <Tracks />
    </div>
  );
}

function PlayButton() {
  const playOrPause = usePlayerSelector((player) => player.playOrPause);
  const playing = usePlayerSelector(
    (player) => player.playhead === "play" || player.playhead === "playing",
  );

  return (
    <Button isIconOnly onClick={playOrPause}>
      <i className="material-icons">{playing ? "pause" : "play_arrow"}</i>
    </Button>
  );
}

function Seekbar() {
  const seekableStart = usePlayerSelector((player) => player.seekableStart);
  const time = usePlayerSelector((player) => player.time);
  const duration = usePlayerSelector((player) => player.duration);
  const seekTo = usePlayerSelector((player) => player.seekTo);

  const seekbar = useSeekbar({
    min: seekableStart,
    max: duration,
    onSeeked: seekTo,
  });

  const percentage = (time - seekableStart) / (duration - seekableStart);

  return (
    <div {...seekbar.rootProps} className="w-full relative cursor-pointer">
      <Tooltip
        x={seekbar.x}
        seekbarRef={seekbar.rootProps.ref}
        visible={seekbar.active}
      >
        {hms(seekbar.value)}
      </Tooltip>
      <div className="relative flex items-center">
        <div className="h-2 bg-default-200 w-full" />
        <div
          className={cn(
            "h-2 absolute left-0 right-0 bg-default-300 origin-left opacity-0 transition-opacity",
            seekbar.hover && "opacity-100",
          )}
          style={{
            transform: `scaleX(${seekbar.x})`,
          }}
        />
        <div
          className={cn("h-2 absolute left-0 right-0 bg-black origin-left")}
          style={{
            transform: `scaleX(${percentage})`,
          }}
        />
      </div>
      <CuePoints />
    </div>
  );
}

function Tooltip({
  x,
  seekbarRef,
  visible,
  children,
}: {
  x: number;
  seekbarRef: RefObject<HTMLDivElement>;
  visible: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  if (ref.current && seekbarRef.current) {
    const seekbarRect = seekbarRef.current.getBoundingClientRect();
    const rect = ref.current.getBoundingClientRect();
    const offset = rect.width / 2 / seekbarRect.width;
    if (x < offset) {
      x = offset;
    } else if (x > 1 - offset) {
      x = 1 - offset;
    }
  }

  return (
    <div
      ref={ref}
      className={cn(
        "pointer-events-none absolute h-6 -top-8 -translate-x-1/2 opacity-0 transition-opacity text-xs text-white bg-black px-1 flex items-center rounded-md",
        visible && "opacity-100",
      )}
      style={{
        left: `${x * 100}%`,
      }}
    >
      {children}
    </div>
  );
}

function CuePoints() {
  const cuePoints = usePlayerSelector((player) => player.cuePoints);
  const duration = usePlayerSelector((player) => player.duration);
  const seekableStart = usePlayerSelector((player) => player.seekableStart);

  return (
    <div className="relative h-4 bg-gray-100 rounded-lg">
      {cuePoints.map((cuePoint) => {
        return (
          <div
            key={cuePoint}
            style={{
              left: `${((cuePoint - seekableStart) / (duration - seekableStart)) * 100}%`,
            }}
            className="absolute -translate-x-1/2 flex items-center flex-col"
          >
            <div className="w-[2px] h-2 bg-yellow-500" />
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
          </div>
        );
      })}
    </div>
  );
}

function Time() {
  const time = usePlayerSelector((player) => player.time);
  const seekableStart = usePlayerSelector((player) => player.seekableStart);
  const duration = usePlayerSelector((player) => player.duration);
  const live = usePlayerSelector((player) => player.live);

  return (
    <div className="flex text-sm mb-2">
      {hms(time)}
      <div className="grow" />
      {live ? `${hms(seekableStart)} - ${hms(duration)}` : `${hms(duration)}`}
    </div>
  );
}

function Tracks() {
  const audioTracks = usePlayerSelector((player) => player.audioTracks);
  const setAudioTrack = usePlayerSelector((player) => player.setAudioTrack);

  const subtitleTracks = usePlayerSelector((player) => player.subtitleTracks);
  const setSubtitleTrack = usePlayerSelector(
    (player) => player.setSubtitleTrack,
  );

  return (
    <div className="flex gap-4">
      <Selection
        items={audioTracks}
        label="Audio"
        getActive={(item) => item.active}
        getKey={(item) => item.id}
        getLabel={(item) => item.label}
        onChange={(item) => setAudioTrack(item.id)}
      />
      <Selection
        items={[
          ...subtitleTracks,
          {
            id: null,
            label: "None",
            active: !subtitleTracks.some((item) => item.active),
          },
        ]}
        getActive={(item) => item.active}
        label="Subtitles"
        getKey={(item) => item.id}
        getLabel={(item) => item.label}
        onChange={(item) => setSubtitleTrack(item.id)}
      />
    </div>
  );
}

function hms(seconds: number) {
  return (
    new Date(seconds * 1000).toUTCString().match(/(\d\d:\d\d:\d\d)/)?.[0] ??
    "00:00:00"
  );
}
