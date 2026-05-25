import { Users } from "lucide-react";

import { getInitials, hexToRgba } from "../../utils/presenceAppearance";

export default function AvatarPresenceGroup({ currentUserId, users }) {
  const normalizedUsers = Array.isArray(users) ? users : [];

  if (!normalizedUsers.length) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/70 px-3 py-1.5 text-xs font-medium text-slate-300">
        <Users className="h-3.5 w-3.5 text-cyan-200" />
        Solo session
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-slate-950/70 px-3 py-1.5 text-xs font-medium text-slate-300">
      <span className="inline-flex items-center gap-2 uppercase tracking-[0.24em] text-slate-400">
        <Users className="h-3.5 w-3.5 text-cyan-200" />
        Live
      </span>

      <div className="flex -space-x-3">
        {normalizedUsers.map((user) => {
          const isCurrentUser = user.id === currentUserId;
          const userKey = user.sessionId || user.id;

          return (
            <div
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border text-[11px] font-semibold uppercase shadow-lg"
              key={userKey}
              style={{
                backgroundColor: hexToRgba(user.color, 0.18),
                borderColor: hexToRgba(user.color, 0.48),
                color: user.color,
              }}
              title={isCurrentUser ? `${user.name} (You)` : `${user.name} · ${user.email}`}
            >
              <span>{getInitials(user.name)}</span>
              {isCurrentUser ? (
                <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border border-slate-950 bg-emerald-300" />
              ) : null}
            </div>
          );
        })}
      </div>

      <span className="text-xs uppercase tracking-[0.24em] text-slate-500">
        {normalizedUsers.length} editor{normalizedUsers.length === 1 ? "" : "s"}
      </span>
    </div>
  );
}