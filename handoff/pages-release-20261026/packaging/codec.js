(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LosslessFloat64 = factory();
})(globalThis, function () {
  'use strict';
  function bytes(field) {
    if (!field || typeof field.data !== 'string') throw Error('Invalid numeric payload');
    return typeof Buffer === 'undefined'
      ? Uint8Array.from(atob(field.data), c => c.charCodeAt(0))
      : Uint8Array.from(Buffer.from(field.data, 'base64'));
  }
  function raw(field, count, fields = {}, active = new Set()) {
    if (!Number.isSafeInteger(count) || count < 0 || !field) throw Error('Invalid numeric count');
    if (active.has(field)) throw Error('Cyclic numeric base');
    active.add(field);
    try {
      const data = bytes(field);
      if (data.length !== count * 8) throw Error('Numeric payload length mismatch');
      if (field.type === 'f64') return data;
      if (field.count !== count) throw Error('Numeric count mismatch');
      if (!['f64-xor-byte-planes', 'f64-xor-sampled-base-planes'].includes(field.type)) throw Error('Unknown numeric encoding');
      const result = new Uint8Array(data.length);
      for (let byte = 0; byte < 8; byte++) for (let i = 0; i < count; i++) result[i * 8 + byte] = data[byte * count + i];
      if (field.type === 'f64-xor-byte-planes') {
        if (!Number.isSafeInteger(field.stride) || field.stride < 1 || count % field.stride) throw Error('Invalid XOR stride');
        for (let i = 0; i < count; i++) if (i % field.stride) for (let byte = 0; byte < 8; byte++) result[i * 8 + byte] ^= result[(i - 1) * 8 + byte];
      } else {
        if (typeof field.base !== 'string' || !Object.prototype.hasOwnProperty.call(fields, field.base)) throw Error('Missing numeric base');
        if (!Number.isSafeInteger(field.baseStride) || field.baseStride < 1 || !Number.isSafeInteger(field.baseOffset) || field.baseOffset < 0 || field.baseOffset >= field.baseStride) throw Error('Invalid base sampling');
        const baseField = fields[field.base], baseCount = bytes(baseField).length / 8;
        if (baseCount !== count * field.baseStride) throw Error('Invalid base dimensions');
        const base = raw(baseField, baseCount, fields, active);
        for (let i = 0; i < count; i++) for (let byte = 0; byte < 8; byte++) result[i * 8 + byte] ^= base[(i * field.baseStride + field.baseOffset) * 8 + byte];
      }
      return result;
    } finally { active.delete(field); }
  }
  function decode(field, count, fields) {
    const data = raw(field, count, fields), view = new DataView(data.buffer, data.byteOffset, data.byteLength), out = new Float64Array(count);
    for (let i = 0; i < count; i++) {
      out[i] = view.getFloat64(i * 8, true);
      if (!Number.isFinite(out[i])) throw Error('Nonfinite numeric value');
    }
    return out;
  }
  return { raw, decode };
});
