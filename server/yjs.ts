import * as Y from 'yjs';

export function createStateFromText(text: string) {
  const doc = new Y.Doc();
  doc.getText('content').insert(0, text);
  return Buffer.from(Y.encodeStateAsUpdate(doc));
}

export function textFromState(state: Uint8Array | Buffer) {
  const doc = new Y.Doc();
  Y.applyUpdate(doc, new Uint8Array(state));
  return doc.getText('content').toString();
}

export function mergeState(base: Uint8Array | Buffer, update: Uint8Array) {
  const doc = new Y.Doc();
  Y.applyUpdate(doc, new Uint8Array(base));
  Y.applyUpdate(doc, update);
  return {
    state: Buffer.from(Y.encodeStateAsUpdate(doc)),
    text: doc.getText('content').toString()
  };
}
