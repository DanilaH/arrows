import fields from './campaign-v4.json' with {type:'json'};
import type {Level} from '../../src/domain/board';
/** Frozen geometry for historical earned-help/feel regression, not the new bank. */
export const campaign=fields as readonly Level[];
