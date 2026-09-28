'use client';

import { useEffect, useRef, useState } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';

import * as monaco from 'monaco-editor';
import * as Y from 'yjs';

import { MonacoBinding } from 'y-monaco';
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate } from 'y-protocols/awareness';
import { io, type Socket } from 'socket.io-client';
import { useTheme } from './ThemeProvider';
import { LoaderCircle } from 'lucide-react';

const colorPalette = ['#B7864B', '#8C5E3C', '#617C6C', '#6B6BA8', '#A65B6C'];
function toBase64(data: Uint8Array) { let out=''; const chunk=0x8000; for(let i=0;i<data.length;i+=chunk){out += String.fromCharCode(...data.subarray(i, Math.min(i+chunk,data.length)));} return btoa(out); }
function fromBase64(value: string) { const bin=atob(value); const out=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) out[i]=bin.charCodeAt(i); return out; }

type FileState = { yState: string; text: string };

type Props = {
  file: { id: string; name: string; language: string };
  canEdit: boolean;
  user: { id: string; name: string };
  roomId: string;
  onSelectionLine?: (line: number) => void;
  onConnection?: (connected: boolean) => void;
  onSocket?: (socket: Socket | null) => void;
};

export default function CollaborativeEditor({ file, canEdit, user, roomId, onSelectionLine, onConnection, onSocket }: Props) {
  const { theme } = useTheme();
  const [state, setState] = useState<FileState | null>(null);
  const [docReady, setDocReady] = useState(false);
  const [editorReady, setEditorReady] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const docRef = useRef<Y.Doc | null>(null);
  const awarenessRef = useRef<Awareness | null>(null);
  const editorRef = useRef<any>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const cursorDisposableRef = useRef<{ dispose(): void } | null>(null);
  const pendingUpdates = useRef<Uint8Array[]>([]);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readyRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setState(null);
    setDocReady(false);
    setEditorReady(false);
    readyRef.current = false;
    (async () => {
      const res = await fetch(`/api/files/${file.id}/state`);
      if (!res.ok || cancelled) return;
      const json = await res.json();
      if (!cancelled) setState({ yState: json.state, text: json.text ?? '' });
    })().catch(() => undefined);
    return () => { cancelled = true; };
  }, [file.id]);

  useEffect(() => {
    if (!state) return;
    const doc = new Y.Doc();
    Y.applyUpdate(doc, fromBase64(state.yState));
    const yText = doc.getText('content');
    if (yText.length === 0 && state.text) yText.insert(0, state.text);

    const awareness = new Awareness(doc);
    awareness.setLocalStateField('user', { name: user.name, color: colorPalette[user.name.charCodeAt(0) % colorPalette.length] });
    const socket = io(process.env.NEXT_PUBLIC_BACKEND_URL, {
  path: '/socket.io',
  transports: ['websocket', 'polling'],
});
    socketRef.current = socket;
    onSocket?.(socket);
    docRef.current = doc;
    awarenessRef.current = awareness;
    setDocReady(true);

    socket.on('connect', () => {
      onConnection?.(true);
      socket.emit('room:join', { roomId });
      socket.emit('file:join', { fileId: file.id });
    });
    socket.on('disconnect', () => onConnection?.(false));
    socket.on('file:sync', ({ state: nextState }: { state: string }) => {
      Y.applyUpdate(doc, fromBase64(nextState), 'remote');
    });
    socket.on('file:update', ({ update }: { update: string }) => {
      Y.applyUpdate(doc, fromBase64(update), 'remote');
    });
    socket.on('file:awareness', ({ update }: { update: string }) => {
      applyAwarenessUpdate(awareness, fromBase64(update), 'remote');
    });

    const updateHandler = (update: Uint8Array, origin: unknown) => {
      if (origin === 'remote' || !canEdit || !readyRef.current) return;
      pendingUpdates.current.push(update);
      if (!flushTimer.current) {
        flushTimer.current = setTimeout(() => {
          flushTimer.current = null;
          if (pendingUpdates.current.length === 0) return;
          const merged = Y.mergeUpdates(pendingUpdates.current);
          pendingUpdates.current = [];
          socket.emit('file:update', { fileId: file.id, update: toBase64(merged) });
        }, 80);
      }
    };
    doc.on('update', updateHandler);

    const awarenessHandler = ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }) => {
      const ids = [...added, ...updated, ...removed];
      if (!ids.length) return;
      socket.emit('file:awareness', { fileId: file.id, update: toBase64(encodeAwarenessUpdate(awareness, ids)) });
    };
    awareness.on('update', awarenessHandler);

    return () => {
      readyRef.current = false;
      if (flushTimer.current) clearTimeout(flushTimer.current);
      pendingUpdates.current = [];
      doc.off('update', updateHandler);
      awareness.off('update', awarenessHandler);
      awareness.destroy();
      doc.destroy();
      socket.disconnect();
      onSocket?.(null);
      docRef.current = null;
      awarenessRef.current = null;
      socketRef.current = null;
      setDocReady(false);
    };
  }, [state, file.id, roomId, user.id, user.name, canEdit, onConnection, onSocket]);

  useEffect(() => {
    if (!docReady || !editorReady) return;
    const editor = editorRef.current;
    const doc = docRef.current;
    const awareness = awarenessRef.current;
    if (!editor || !doc || !awareness) return;
    const model = editor.getModel();
    if (!model) return;

    bindingRef.current?.destroy();
    cursorDisposableRef.current?.dispose();

    const yText = doc.getText('content');
    const binding = new MonacoBinding(yText, model, new Set([editor]), awareness);
    bindingRef.current = binding;

    const sharedText = yText.toString();
    if (model.getValue() !== sharedText) model.setValue(sharedText);

    readyRef.current = true;
    cursorDisposableRef.current = editor.onDidChangeCursorSelection(
  (event: monaco.editor.ICursorSelectionChangedEvent) => {
    onSelectionLine?.(event.selection.startLineNumber);
  }
);

    return () => {
      readyRef.current = false;
      cursorDisposableRef.current?.dispose();
      cursorDisposableRef.current = null;
      bindingRef.current?.destroy();
      bindingRef.current = null;
    };
  }, [docReady, editorReady, file.id, onSelectionLine]);

  const onMount: OnMount = (editor) => {
    editorRef.current = editor;
    setEditorReady(true);
  };

  if (!state) return <div className="editor-loading"><LoaderCircle className="spin" size={24} /><span>Preparing shared workspace…</span></div>;

  const language = file.language === 'cpp' ? 'cpp' : file.language === 'javascript' ? 'javascript' : file.language === 'typescript' ? 'typescript' : file.language === 'java' ? 'java' : file.language === 'markdown' ? 'markdown' : 'python';
  return <div className="editor-root">
    <Editor
      key={`${file.id}-${theme}`}
      height="100%"
      width="100%"
      theme={theme === 'dark' ? 'vs-dark' : 'vs'}
      defaultLanguage={language}
      defaultValue=""
      onMount={onMount}
      options={{ readOnly: !canEdit, minimap: { enabled: false }, fontSize: 14, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', scrollBeyondLastLine: false, smoothScrolling: true, padding: { top: 18, bottom: 18 }, renderLineHighlight: 'gutter', automaticLayout: true }}
    />
  </div>;
}
