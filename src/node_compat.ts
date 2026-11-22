// @tensorflow/tfjs-node 4.22 still calls util.isArray / util.isNullOrUndefined, which were
// deprecated in Node 22 and removed in Node 23+. Restore them (without deprecation warnings)
// before tfjs-node is loaded. Must be the first import in the entry point.
import util from 'node:util';

const legacyUtil = util as typeof util & {
  isArray: (value: unknown) => boolean;
  isNullOrUndefined: (value: unknown) => boolean;
};

legacyUtil.isArray = Array.isArray;
legacyUtil.isNullOrUndefined = (value: unknown) => value === null || value === undefined;
