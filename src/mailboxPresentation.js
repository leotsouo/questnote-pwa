// Presentation only: rewards and persisted read/claim identities remain on the source letters.
const GIFT_GROUPS = [
  {
    id: 'mailbox-bundle-welcome', title: '歡迎與常駐贈禮', icon: '🎉',
    body: '歡迎來到 QuestNote！收下旅程贈禮，依自己的步調探索與夥伴相遇。這裡整理了原有常駐贈禮；已領取的附件不會重複發放。',
    ids: ['2026-07-welcome-10pull', 'system_mail_v342_eternal_slumber_launch'],
  },
  {
    id: 'mailbox-bundle-updates', title: '近期更新贈禮', icon: '🎁',
    body: '謝謝你陪伴 QuestNote 成長！近期更新的贈禮整理在這裡，可使用上方的一鍵領取收下所有可領附件。各份贈禮保留原本期限；已領取的附件不會重複發放。',
    ids: ['2026-10-v362-encounter-fragments-gift-01', '2026-10-lionheart-inverse-oath-summon-gift-01',
      '2026-10-v3521-collection-summon-redesign-gift', '2026-10-frequent-updates-compensation-01',
      '2026-09-v3421-expedition-update-gift', '2026-09-v3413-growth-lessons-gift'],
  },
];

export function consolidateMailboxMessages(messages) {
  const byId = new Map(messages.map((message) => [message.id, message]));
  const groups = new Map();
  for (const group of GIFT_GROUPS) {
    const members = group.ids.map((id) => byId.get(id)).filter((message) => message?.source !== 'local-dev' && message?.type === 'compensation');
    if (!members.length) continue;
    const claimable = members.some((message) => message.status.claimable);
    const claimed = members.every((message) => message.status.claimed);
    const unread = members.some((message) => message.status.unread);
    const envelope = {
      ...members.reduce((latest, message) => message.publishedAtMs > latest.publishedAtMs ? message : latest),
      ...group, memberMessages: members, reward: null, rewardError: null, action: null,
      status: { visible: true, read: !unread, unread, claimable, claimed,
        claimStatus: claimable ? 'claimable' : claimed ? 'claimed' : null },
    };
    for (const member of members) groups.set(member.id, envelope);
  }
  const seen = new Set();
  return messages.flatMap((message) => {
    const envelope = groups.get(message.id) || message;
    if (seen.has(envelope.id)) return [];
    seen.add(envelope.id);
    return [envelope];
  });
}
