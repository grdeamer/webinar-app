"use client";

import type { JSX } from "react";
import { useTracks, VideoTrack } from "@livekit/components-react";
import { Track } from "livekit-client";
import type { PreviewBlock } from "./useProducerBlocks";

export function ProducerRoomAtmosphere({
  isLive,
}: {
  isLive: boolean;
}): JSX.Element {
  return (
    <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
      <div className="absolute -right-[12vw] -top-[26vw] aspect-square w-[48vw] max-w-[760px] rounded-full border border-blue-200/[0.08] bg-[radial-gradient(circle_at_32%_32%,rgba(112,157,255,0.28),transparent_22%),radial-gradient(circle_at_48%_54%,rgba(35,83,177,0.54),rgba(7,20,54,0.78)_56%,rgba(2,7,20,0.92)_76%)] opacity-28 shadow-[-30px_40px_110px_rgba(57,111,224,0.12)]" />
      <div
        className={`absolute left-[-20%] top-[6%] h-[430px] w-[430px] rounded-full blur-3xl transition-opacity duration-1000 ${
          isLive ? "bg-red-300/[0.030] opacity-44" : "bg-sky-200/[0.036] opacity-40"
        } animate-[producerAtmosphereDrift_34s_ease-in-out_infinite]`}
      />
      <div className="absolute right-[-18%] top-[26%] h-[460px] w-[460px] rounded-full bg-sky-200/[0.018] blur-3xl animate-[producerAtmosphereCounterDrift_38s_ease-in-out_infinite]" />
      <div className="absolute bottom-[-24%] left-[26%] h-[470px] w-[470px] rounded-full bg-cyan-200/[0.022] blur-3xl animate-[producerAtmosphereBloom_36s_ease-in-out_infinite]" />

      <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.003)_38%,transparent_62%)] animate-[producerTransmissionSheen_42s_ease-in-out_infinite]" />
      <div className="absolute inset-0 bg-[repeating-linear-gradient(to_bottom,rgba(255,255,255,0.008)_0px,rgba(255,255,255,0.008)_1px,transparent_1px,transparent_16px)] opacity-[0.018]" />

      {isLive ? (
        <div className="absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-red-200/24 to-transparent animate-[producerLiveScan_4.6s_ease-in-out_infinite]" />
      ) : null}

      <style jsx global>{`
        @keyframes producerAtmosphereDrift {
          0%,
          100% {
            transform: translate3d(0, 0, 0) scale(1);
          }

          50% {
            transform: translate3d(26px, 16px, 0) scale(1.04);
          }
        }

        @keyframes producerAtmosphereCounterDrift {
          0%,
          100% {
            transform: translate3d(0, 0, 0) scale(1);
          }

          50% {
            transform: translate3d(-22px, 12px, 0) scale(1.035);
          }
        }

        @keyframes producerAtmosphereBloom {
          0%,
          100% {
            opacity: 0.18;
            transform: scale(1);
          }

          50% {
            opacity: 0.32;
            transform: scale(1.04);
          }
        }

        @keyframes producerTransmissionSheen {
          0%,
          100% {
            opacity: 0;
            transform: translateX(-18%);
          }

          45% {
            opacity: 0.14;
          }

          100% {
            transform: translateX(18%);
          }
        }

        @keyframes producerLiveScan {
          0%,
          100% {
            opacity: 0.15;
            transform: translateY(0);
          }

          50% {
            opacity: 0.28;
            transform: translateY(6px);
          }
        }
      `}</style>
    </div>
  );
}

export function CameraSlotLiveContent({
  block,
}: {
  block: PreviewBlock;
}): JSX.Element | null {
  const cameraTracks = useTracks([Track.Source.Camera], {
    onlySubscribed: false,
  });

  if (!block.assignedParticipantId) return null;

  const assignedTrack = cameraTracks.find(
    (trackRef) => trackRef.participant.identity === block.assignedParticipantId,
  );

  if (!assignedTrack) return null;

  return (
    <VideoTrack
      trackRef={assignedTrack}
      className="h-full w-full object-cover"
    />
  );
}
