
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export interface Quest {
  id: string;
  timestamp: number;
  input: string;
  title: string;
  summary: string;
  rank: 'E' | 'D' | 'C' | 'B' | 'A' | 'S';
  xpAwarded: number;
  auraColor: string;
  iconHtml: string;
}

export interface UserStats {
  level: number;
  xp: number;
  maxXp: number;
  title: string;
}

/**
 * Added Artifact interface to resolve import errors in components/ArtifactCard.tsx
 */
export interface Artifact {
  id: string;
  html: string;
  styleName: string;
  status: 'streaming' | 'completed';
}
