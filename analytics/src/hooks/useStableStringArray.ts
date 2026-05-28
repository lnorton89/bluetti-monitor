import { useRef } from 'react';
import { areSameFields } from '../lib/constants';

export function useStableStringArray(values: string[]) {
  const stableRef = useRef(values);
  if (!areSameFields(stableRef.current, values)) {
    stableRef.current = values;
  }
  return stableRef.current;
}
