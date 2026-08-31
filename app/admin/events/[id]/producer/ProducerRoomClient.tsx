"use client";

import type { JSX } from "react";

import useProducerRoomClient from "./useProducerRoomClient";
import ProducerRoomClientView from "./ProducerRoomClientView";

export default function ProducerRoomClient({
  eventId,
  sessionId,
  sessionTitle,
  eventTitle,
  eventAccent,
}: {
  eventId: string;
  sessionId: string;
  sessionTitle?: string;
  eventTitle?: string;
  eventAccent?: string;
}): JSX.Element {
  const viewProps = useProducerRoomClient({ eventId, sessionId, sessionTitle, eventTitle, eventAccent });
  return <ProducerRoomClientView {...viewProps} />;
}
