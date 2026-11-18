import { notFound } from 'next/navigation';

import { ASSISTANT_MANAGEMENT_ENABLED } from '@/lib/featureFlags';

export default function AssistantsLayout({ children }: { children: React.ReactNode }) {
  if (!ASSISTANT_MANAGEMENT_ENABLED) {
    notFound();
  }

  return children;
}
