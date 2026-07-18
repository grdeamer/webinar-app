import React from "react";
import type { ReactNode } from "react";

const systemComponents = {
  // other components
  sessions_list: (() => {
    const sessionsBlock = "sessions_list";
    const sessionsProps: Record<string, unknown> = {
      someProp: true,
    };

    const sampleSessions = [
      { id: 1, title: "Session 1", speaker: "Speaker A" },
      { id: 2, title: "Session 2", speaker: "Speaker B" },
    ];

    return (
      <div>
        <h2>Sessions</h2>
        <ul>
          {sampleSessions.map((session) => (
            <li key={session.id}>
              {session.title} - {session.speaker}
            </li>
          ))}
        </ul>
      </div>
    );
  })(),
  // other components
};