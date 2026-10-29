import type { z } from 'zod';
import type { commandSchema } from './service';
export type Command = z.infer<typeof commandSchema>;
export type Send = (command: Command) => void;
