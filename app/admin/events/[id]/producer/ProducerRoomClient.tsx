"use client";

import type { JSX } from "react";

import useProducerRoomClient from "./useProducerRoomClient";
import ProducerRoomClientView from "./ProducerRoomClientView";

export default function ProducerRoomClient({
  eventId,
  sessionId,
  sessionTitle,
}: {
  eventId: string;
  sessionId: string;
  sessionTitle?: string;
}): JSX.Element {
  const viewProps = useProducerRoomClient({ eventId, sessionId, sessionTitle });
  return <ProducerRoomClientView {...viewProps} />;
}
