"use client";

import type { HostedStudioConfig } from "@/lib/production/hosted/studioConfig";
import type { JSX } from "react";

import {ProducerLayoutProvider} from "./ProducerLayoutContext";
import useProducerRoomClient from "./useProducerRoomClient";
import ProducerRoomClientView from "./ProducerRoomClientView";

export default function ProducerRoomClient({
  eventId,
  sessionId,
  sessionTitle,
  eventTitle,
  eventAccent,
  engine,
  preferenceOwnerId,
}: {
  eventId: string;
  sessionId: string;
  sessionTitle?: string;
  eventTitle?: string;
  eventAccent?: string;
  engine?: HostedStudioConfig;
  preferenceOwnerId?:string;
}): JSX.Element {
  const viewProps = useProducerRoomClient({ eventId, sessionId, sessionTitle, eventTitle, eventAccent, engine });
  return <ProducerLayoutProvider ownerId={preferenceOwnerId}><ProducerRoomClientView {...viewProps} /></ProducerLayoutProvider>;
}
