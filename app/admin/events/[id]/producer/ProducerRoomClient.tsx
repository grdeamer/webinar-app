"use client";

import type { HostedStudioConfig } from "@/lib/production/hosted/studioConfig";
import type { JSX } from "react";

import useProducerRoomClient from "./useProducerRoomClient";
import ProducerRoomClientView from "./ProducerRoomClientView";

export default function ProducerRoomClient({
  eventId,
  sessionId,
  sessionTitle,
  eventTitle,
  eventAccent,
  engine,
}: {
  eventId: string;
  sessionId: string;
  sessionTitle?: string;
  eventTitle?: string;
  eventAccent?: string;
  engine?: HostedStudioConfig;
}): JSX.Element {
  const viewProps = useProducerRoomClient({ eventId, sessionId, sessionTitle, eventTitle, eventAccent, engine });
  return <ProducerRoomClientView {...viewProps} />;
}
