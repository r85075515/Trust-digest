"use client";

import { useCallback, useEffect, useState } from "react";
import type { InteractionType, PersonalizationState, Story } from "@/lib/types";
import {
  applyInteraction,
  DEFAULT_STATE,
  DEFAULT_WEIGHTS,
  loadPersonalization,
  rankStories,
  savePersonalization,
} from "@/lib/personalization";

export function usePersonalization() {
  const [state, setState] = useState<PersonalizationState>({
    ...DEFAULT_STATE,
    weights: { ...DEFAULT_WEIGHTS },
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setState(loadPersonalization());
    setReady(true);
  }, []);

  const persist = useCallback((next: PersonalizationState) => {
    setState(next);
    savePersonalization(next);
  }, []);

  const interact = useCallback(
    (story: Story, type: InteractionType) => {
      persist(applyInteraction(state, story, type));
    },
    [persist, state]
  );

  const reset = useCallback(() => {
    const fresh = {
      ...DEFAULT_STATE,
      weights: { ...DEFAULT_WEIGHTS },
    };
    persist(fresh);
  }, [persist]);

  const rank = useCallback(
    (stories: Story[]) => rankStories(stories, state),
    [state]
  );

  return { state, ready, interact, reset, rank };
}
