'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, FileCode2, Flag, GitBranch, GripHorizontal, MessageCircle, Play, Plus, Share2, Trash2, Trophy, Users, X } from 'lucide-react';
import type { Socket } from 'socket.io-client';
import CollaborativeEditor from './CollaborativeEditor';
import Loading from './Loading';
import { PROBLEM_TEMPLATES, type ProblemTemplate } from '@/lib/problems';

type FileItem={id:string;name:string;path:string;language:string;projectId:string};
type CommentItem={id:string;line:number;content:string;resolved:boolean;createdAt:string;user:{name:string}};

type Problem = {
  templateId?: string;
  title: string;
  difficulty: 'EASY'|'MEDIUM'|'HARD';
  tags: string[];
  description: string;
  constraints: string[];
  examples: Array<{input:string;output:string;explanation?:string}>;
  starterCode?: string;
};

function statusLabel(status?: string) {
  switch (status) {
    case 'COMPLETED': return 'Accepted';
    case 'TIMEOUT': return 'Time limit exceeded';
    case 'FAILED': return 'Wrong answer / runtime error';
    case 'RUNNING': return 'Running';
    case 'QUEUED': return 'Queued';
    default: return status ?? 'No run yet';
  }
}

export default function RoomClient({ roomId }: { roomId:string }){
  const [data,setData]=useState<any>(null);
  const [selectedFile,setSelectedFile]=useState<FileItem|null>(null);
  const [user,setUser]=useState<any>(null);
  const [comments,setComments]=useState<CommentItem[]>([]);
  const [tests,setTests]=useState<any[]>([]);
  const [executions,setExecutions]=useState<any[]>([]);
  const [output,setOutput]=useState<any>(null);
  const [line,setLine]=useState(1);
  const [comment,setComment]=useState('');
  const [connected,setConnected]=useState(false);
  const [presence,setPresence]=useState<any[]>([]);
  const [invite,setInvite]=useState('');
  const [socket,setSocket]=useState<Socket | null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [challengeOpen,setChallengeOpen]=useState(false);
  const [showProblem,setShowProblem]=useState(true);
  const [consoleTab,setConsoleTab]=useState<'tests'|'output'|'comments'>('tests');
  const [consoleHeight,setConsoleHeight]=useState(285);
  const dragRef=useRef<{startY:number;startHeight:number}|null>(null);

  const canEdit = data?.membership?.role === 'OWNER' || data?.membership?.role === 'EDITOR';
  const canManageTests = data?.membership?.role === 'OWNER' || data?.membership?.role === 'INTERVIEWER';
  const canRun = data?.membership?.role !== 'VIEWER';

  const files=useMemo(()=>(data?.room?.projects?.flatMap((p:any)=>p.files)??[]) as FileItem[],[data]);
  const problem=data?.room?.problem as Problem | null;
  const selectedTestCount=tests.filter(t=>!t.hidden).length;
  const hiddenTestCount=tests.filter(t=>t.hidden).length;
  const resultRows=Array.isArray(output?.results)?output.results:[];
  const passedCount=resultRows.filter((t:any)=>t.passed).length;
  const totalCount=resultRows.length;

  async function load(){
    const me=await fetch('/api/auth/me');
    if(!me.ok){window.location.href='/login';return;}
    setUser((await me.json()).user);
    const res=await fetch(`/api/rooms/${roomId}`);
    if(!res.ok){setError((await res.json()).error??'Room not found');setLoading(false);return;}
    const json=await res.json();
    setData(json);
    const nextFiles=(json.room.projects?.flatMap((p:any)=>p.files)??[]) as FileItem[];
    setSelectedFile(prev => prev && nextFiles.some(f=>f.id===prev.id) ? prev : nextFiles[0] ?? null);
    const [t,e]=await Promise.all([fetch(`/api/rooms/${roomId}/tests`),fetch(`/api/rooms/${roomId}/executions`)]);
    if(t.ok)setTests((await t.json()).tests);
    if(e.ok)setExecutions((await e.json()).executions);
    if(nextFiles[0]){
      const fileForComments=selectedFile && nextFiles.some(f=>f.id===selectedFile.id)?selectedFile:nextFiles[0];
      const c=await fetch(`/api/files/${fileForComments.id}/comments`);
      if(c.ok)setComments((await c.json()).comments);
    }
    setLoading(false);
  }

  useEffect(()=>{load();},[roomId]);
  useEffect(()=>{if(selectedFile)refreshComments(selectedFile.id);},[selectedFile?.id]);
  useEffect(()=>{
    if(!socket)return;
    const onPresence=(people:any[])=>setPresence(people);
    const onExecution=async ({executionId}:any)=>{
      const r=await fetch(`/api/executions/${executionId}`);
      if(r.ok){const j=await r.json();setOutput(j.execution);setExecutions(prev=>[j.execution,...prev.filter(x=>x.id!==executionId)]);}
    };
    socket.on('presence:room',onPresence);
    socket.on('execution:update',onExecution);
    return()=>{socket.off('presence:room',onPresence);socket.off('execution:update',onExecution);};
  },[socket]);

  useEffect(()=>{
    const onMove=(event:PointerEvent)=>{
      if(!dragRef.current)return;
      const delta=dragRef.current.startY-event.clientY;
      setConsoleHeight(Math.min(520,Math.max(170,dragRef.current.startHeight+delta)));
    };
    const onUp=()=>{dragRef.current=null;document.body.style.cursor='';document.body.style.userSelect='';};
    window.addEventListener('pointermove',onMove);
    window.addEventListener('pointerup',onUp);
    return()=>{window.removeEventListener('pointermove',onMove);window.removeEventListener('pointerup',onUp);};
  },[]);

  async function refreshComments(fileId=selectedFile?.id){if(!fileId)return;const r=await fetch(`/api/files/${fileId}/comments`);if(r.ok)setComments((await r.json()).comments);}
  async function refreshTests(){const r=await fetch(`/api/rooms/${roomId}/tests`);if(r.ok)setTests((await r.json()).tests);}
  async function run(){
    if(!selectedFile)return;
    setError('');
    setConsoleTab('tests');
    const r=await fetch(`/api/rooms/${roomId}/executions`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({fileId:selectedFile.id})});
    const j=await r.json();
    if(!r.ok){setError(j.error??'Could not queue execution.');return;}
    setOutput(j.execution);
  }
  async function addComment(){if(!selectedFile||!comment.trim())return;const r=await fetch(`/api/files/${selectedFile.id}/comments`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({line,content:comment})});if(r.ok){setComment('');refreshComments();}}
  async function inviteUser(){const r=await fetch(`/api/rooms/${roomId}/invites`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({hours:72,maxUses:20})});const j=await r.json();if(r.ok){setInvite(j.inviteUrl);await navigator.clipboard?.writeText(j.inviteUrl);}}
  async function createFile(){
    const name=window.prompt('File name');
    if(!name)return;
    const ext=name.split('.').pop()?.toLowerCase();
    const language=ext==='cpp'||ext==='cc'?'cpp':ext==='java'?'java':ext==='js'?'javascript':ext==='ts'?'typescript':ext==='md'?'markdown':'python';
    const r=await fetch(`/api/rooms/${roomId}/files`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name,language,content:''})});
    if(r.ok)await load();
  }
  async function deleteFile(file:FileItem){
    if(!canEdit)return;
    if(files.length<=1){setError('Keep at least one workspace file in the room.');return;}
    const yes=window.confirm(`Delete ${file.name}? This removes its comments and linked execution history.`);
    if(!yes)return;
    const r=await fetch(`/api/files/${file.id}`,{method:'DELETE'});
    const j=await r.json();
    if(!r.ok){setError(j.error??'Could not delete file.');return;}
    if(selectedFile?.id===file.id)setSelectedFile(null);
    await load();
  }
  async function deleteTest(id:string){if(!canManageTests)return;if(!window.confirm('Delete this test case?'))return;const r=await fetch(`/api/tests/${id}`,{method:'DELETE'});if(r.ok)refreshTests();}
  async function applyStarter(problemToApply:Problem){
    if(!selectedFile||!problemToApply.starterCode||!canEdit)return;
    const yes=window.confirm(`Replace ${selectedFile.name} with the starter code for “${problemToApply.title}”? Current file content will be replaced.`);
    if(!yes)return;
    const r=await fetch(`/api/files/${selectedFile.id}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({content:problemToApply.starterCode})});
    if(r.ok)window.location.reload();
  }

  if(loading)return <div className="page-shell"><Loading label="Opening shared room…"/></div>;
  if(error && !data)return <div className="page-shell"><div className="form-error">{error}</div></div>;

  return <main className="room-layout">
    <aside className="room-sidebar">
      <div className="room-sidebar-top">
        <div className="room-identity"><span className="eyebrow">Room</span><strong>{data.room.name}</strong><small>{data.room.mode} · {data.room.members.length} member{data.room.members.length===1?'':'s'}</small></div>
        {canEdit&&<button className="icon-button" onClick={createFile} title="New file"><Plus size={16}/></button>}
      </div>
      <div className="file-tree">
        <div className="tree-heading"><span>Workspace</span><span>{files.length}</span></div>
        {files.map(file=><div className={`file-row-wrap ${selectedFile?.id===file.id?'active':''}`} key={file.id}>
          <button className="file-row" onClick={()=>{setSelectedFile(file);setConsoleTab('tests')}}><FileCode2 size={15}/><span>{file.name}</span><small>{file.language}</small></button>
          {canEdit&&<button className="file-delete" onClick={()=>deleteFile(file)} title={`Delete ${file.name}`}><Trash2 size={14}/></button>}
        </div>)}
        <div className="tree-heading session-heading"><span>Session</span></div>
        <a className="file-row" href={`/room/${roomId}/replay`}><GitBranch size={15}/> Replay timeline</a>
      </div>
      <div className="room-side-footer">
        <button className="button button-ghost wide" onClick={inviteUser}><Share2 size={15}/> Invite collaborator</button>
        {invite&&<div className="invite-note"><strong>Copied</strong><span>{invite}</span></div>}
      </div>
    </aside>

    <section className="room-main">
      <div className="room-toolbar">
        <div className="room-toolbar-left">
          <div className="inline-status"><span className={`online-dot ${connected?'':'status-danger'}`}></span>{connected?'Connected':'Reconnecting…'}</div>
          <span className="toolbar-separator">/</span>
          <span className="room-subtitle">{selectedFile?.name ?? 'No file selected'}</span>
          {problem&&<span className={`difficulty-pill ${problem.difficulty.toLowerCase()}`}>{problem.difficulty}</span>}
        </div>
        <div className="room-toolbar-right">
          <div className="presence-pill"><Users size={14}/><span>{presence.length || data.room.members.length}</span></div>
          {problem&&<button className="button button-ghost" onClick={()=>setShowProblem(v=>!v)}><Flag size={14}/>{showProblem?'Hide problem':'Show problem'}</button>}
          <button className="button button-gold" onClick={run} disabled={!canRun||!selectedFile||selectedFile.language==='markdown'}><Play size={15}/> Run tests</button>
        </div>
      </div>

      <div className={`room-workspace ${problem&&showProblem?'has-problem':'no-problem'}`}>
        {problem&&showProblem&&<section className="problem-panel animate-in">
          <div className="problem-header">
            <div><div className="section-kicker"><Trophy size={14}/> Active challenge</div><h2>{problem.title}</h2><div className="tag-row">{problem.tags?.map(tag=><span className="tag" key={tag}>{tag}</span>)}</div></div>
            <div className="challenge-actions">
              {problem.starterCode&&canEdit&&<button className="button button-accent" onClick={()=>applyStarter(problem)}>Load starter code</button>}
              {canManageTests&&<button className="button button-gold" onClick={()=>setChallengeOpen(true)}>Edit challenge</button>}
            </div>
          </div>
          <p className="problem-description">{problem.description}</p>
          <div className="problem-detail-grid">
            <div><span className="mini-title">Examples</span><div className="example-grid compact">{problem.examples?.slice(0,2).map((ex,i)=><div className="example-card" key={i}><span>Example {i+1}</span><code>{ex.input}</code><code>→ {ex.output}</code></div>)}</div></div>
            <div><span className="mini-title">Constraints</span><ul className="constraint-list">{problem.constraints?.slice(0,5).map((c,i)=><li key={i}>{c}</li>)}</ul></div>
          </div>
        </section>}

        <div className="editor-stage">
          {selectedFile&&user?<CollaborativeEditor file={selectedFile} canEdit={canEdit} user={user} roomId={roomId} onSelectionLine={setLine} onConnection={setConnected} onSocket={setSocket}/>:<div className="editor-empty"><FileCode2 size={28}/><strong>Select a workspace file</strong><span>Choose a file from the left rail to start editing.</span></div>}
        </div>

        <div className="console-resizer" onPointerDown={(event)=>{dragRef.current={startY:event.clientY,startHeight:consoleHeight};document.body.style.cursor='row-resize';document.body.style.userSelect='none';}} title="Drag to resize output panel"><GripHorizontal size={16}/></div>
        <section className="room-console" style={{height:consoleHeight}}>
          <div className="console-head">
            <div className="console-tabs">
              <button className={consoleTab==='tests'?'active':''} onClick={()=>setConsoleTab('tests')}>Test results <span>{totalCount||tests.length||0}</span></button>
              <button className={consoleTab==='output'?'active':''} onClick={()=>setConsoleTab('output')}>Output</button>
              <button className={consoleTab==='comments'?'active':''} onClick={()=>setConsoleTab('comments')}>Comments <span>{comments.length}</span></button>
            </div>
            {output&&<div className={`console-status ${output.status?.toLowerCase()}`}>{statusLabel(output.status)}</div>}
          </div>

          <div className="console-body">
            {consoleTab==='tests'&&<div className="tests-console">
              <div className="test-summary">
                <div><strong>{output ? `${passedCount}/${totalCount} passed` : `${selectedTestCount} public · ${hiddenTestCount} hidden`}</strong><span>{output?.failureReason ?? (problem?'Run tests to validate the active challenge.':'Add a challenge to evaluate your solution automatically.')}</span></div>
                {canManageTests&&<button className="button button-ghost" onClick={()=>setChallengeOpen(true)}>Manage tests</button>}
              </div>
              {output && resultRows.length>0 ? <div className="result-grid">{resultRows.map((t:any)=><article key={t.id} className={`result-card ${t.passed?'passed':'failed'}`}>
                <div className="result-top"><div><strong>{t.passed?'✓':'×'} {t.name}</strong><span>{t.hidden?'Hidden test':'Example test'}</span></div><small>{t.durationMs}ms</small></div>
                <div className="result-values"><div><span>Expected</span><code>{t.hidden&&!canManageTests?'Hidden':String(t.expected ?? '—')}</code></div><div><span>Output</span><code>{t.hidden&&!canManageTests?'Hidden':String(t.stdout ?? '—').trim() || 'No output'}</code></div></div>
              </article>)}</div> : <div className="console-empty"><BookOpen size={22}/><strong>{problem?'No run yet':'No challenge selected'}</strong><span>{problem?'Write your solution, then click Run tests.':'Create a challenge from the problem library or write your own.'}</span></div>}
            </div>}

            {consoleTab==='output'&&<div className="output-console">{output?<>{output.stdout&&<div><span>stdout</span><pre>{output.stdout}</pre></div>}{output.stderr&&<div><span>stderr</span><pre className="stderr">{output.stderr}</pre></div>}{output.failureReason&&<div className="console-error">{output.failureReason}</div>}</>:<div className="console-empty"><Play size={22}/><strong>Execution output</strong><span>Run the current file to see stdout, stderr and execution details.</span></div>}</div>}

            {consoleTab==='comments'&&<div className="comments-console">
              <div className="comment-compose"><div><span>Line {line}</span><strong>Add a review note</strong></div><textarea className="compact-input" rows={3} value={comment} onChange={e=>setComment(e.target.value)} placeholder="Leave a note on the selected line"/><button className="button button-accent" onClick={addComment}><MessageCircle size={15}/> Add comment</button></div>
              <div className="comment-list">{comments.length===0?<div className="console-empty compact"><MessageCircle size={20}/><span>No comments on this file yet.</span></div>:comments.map(c=><div className="comment-row open" key={c.id}><strong>Line {c.line} · {c.user.name}</strong><span>{c.content}</span></div>)}</div>
            </div>}
          </div>
        </section>
      </div>
    </section>

    <aside className="room-inspector">
      <div className="inspector-section challenge-section">
        <div className="inspector-title-row"><h4>Challenge</h4>{canManageTests&&<button className="icon-button small" onClick={()=>setChallengeOpen(true)} title="Choose or create a challenge"><Plus size={14}/></button>}</div>
        {problem?<div className="challenge-card"><div className="challenge-card-title"><div><strong>{problem.title}</strong><span className={`difficulty-pill ${problem.difficulty.toLowerCase()}`}>{problem.difficulty}</span></div><span className="problem-source">{problem.templateId?'Library':'Custom'}</span></div><p>{problem.description}</p><div className="challenge-stat"><span><BookOpen size={13}/> {selectedTestCount} public</span><span><Flag size={13}/> {hiddenTestCount} hidden</span></div></div>:<div className="challenge-empty"><Trophy size={24}/><strong>No challenge selected</strong><span>Choose a curated problem or write your own.</span>{canManageTests&&<button className="button button-gold" onClick={()=>setChallengeOpen(true)}>Add challenge</button>}</div>}
      </div>
      <div className="inspector-section"><div className="inspector-title-row"><h4>People</h4><span className="badge">{presence.length||data.room.members.length}</span></div><div className="inspector-list">{data.room.members.map((m:any)=><div key={m.id} className="person-row"><span className="avatar tiny">{m.user.name.slice(0,1).toUpperCase()}</span><span className="person-name"><strong>{m.user.name}</strong><small>{m.role}</small></span><span className="online-dot"></span></div>)}</div></div>
      <div className="inspector-section"><div className="inspector-title-row"><h4>Recent runs</h4><button className="icon-button small" onClick={()=>setConsoleTab('output')} title="Open output"><Play size={13}/></button></div><div className="inspector-list">{executions.slice(0,6).map((run:any)=><button className={`run-row run-${String(run.status).toLowerCase()}`} key={run.id} onClick={()=>{setOutput(run);setConsoleTab('tests')}}><div><strong>{statusLabel(run.status)}</strong><span>{run.file?.name ?? 'File'} · {run.user?.name ?? 'User'}</span></div><small>{run.durationMs?`${run.durationMs}ms`:'queued'}</small></button>)}</div></div>
      <div className="inspector-section inspector-actions"><h4>Room actions</h4><div className="action-stack">{canManageTests&&<button className="button button-ghost wide" onClick={()=>setChallengeOpen(true)}><Trophy size={15}/> Manage challenge</button>}<button className="button button-ghost wide" onClick={inviteUser}><Share2 size={15}/> Invite collaborator</button><a className="button button-ghost wide" href={`/room/${roomId}/replay`}><GitBranch size={15}/> Replay timeline</a></div></div>
    </aside>

    {challengeOpen&&<ProblemManager roomId={roomId} fileId={selectedFile?.id} current={problem} onClose={()=>setChallengeOpen(false)} onSaved={async()=>{setChallengeOpen(false);await load();await refreshTests();}}/>}
    {error&&<div className="room-toast" role="alert"><span>{error}</span><button className="icon-button small" onClick={()=>setError('')}><X size={13}/></button></div>}
  </main>;
}

function ProblemManager({roomId,current,onClose,onSaved}:{roomId:string;fileId?:string;current:Problem|null;onClose:()=>void;onSaved:()=>void}){
  const [tab,setTab]=useState<'library'|'custom'>(current?.templateId?'library':'custom');
  const [selected,setSelected]=useState<ProblemTemplate|null>(current?.templateId?PROBLEM_TEMPLATES.find(p=>p.id===current?.templateId)??null:null);
  const [title,setTitle]=useState(current?.title??''); const [difficulty,setDifficulty]=useState<Problem['difficulty']>(current?.difficulty??'EASY'); const [description,setDescription]=useState(current?.description??''); const [constraints,setConstraints]=useState((current?.constraints??[]).join('\n')); const [exampleInput,setExampleInput]=useState(current?.examples?.[0]?.input??''); const [exampleOutput,setExampleOutput]=useState(current?.examples?.[0]?.output??''); const [testName,setTestName]=useState('Example 1'); const [testInput,setTestInput]=useState(''); const [testExpected,setTestExpected]=useState(''); const [testHidden,setTestHidden]=useState(false); const [tests,setTests]=useState<any[]>([]); const [busy,setBusy]=useState(false); const [error,setError]=useState('');
  useEffect(()=>{if(selected){setTitle(selected.title);setDifficulty(selected.difficulty);setDescription(selected.description);setConstraints(selected.constraints.join('\n'));setExampleInput(selected.examples[0]?.input??'');setExampleOutput(selected.examples[0]?.output??'');setTests(selected.tests.map((t,i)=>({...t,order:i})));}},[selected]);
  useEffect(()=>{if(tab!=='custom'||!current)return;fetch(`/api/rooms/${roomId}/tests`).then(async r=>{if(r.ok){const j=await r.json();setTests(j.tests.map((t:any,i:number)=>({name:t.name,input:t.input,expected:t.expected,hidden:t.hidden,order:i})));}}).catch(()=>undefined);},[tab,current,roomId]);
  function addCustomTest(){if(!testName.trim())return;setTests(prev=>[...prev,{name:testName,input:testInput,expected:testExpected,hidden:testHidden,order:prev.length}]);setTestName(`Example ${tests.length+2}`);setTestInput('');setTestExpected('');setTestHidden(false);}
  function chooseTemplate(t:ProblemTemplate){setSelected(t);setTab('library');}
  async function save(){
    setBusy(true);setError('');
    const payload=selected?{problem:{templateId:selected.id,title:selected.title,difficulty:selected.difficulty,tags:selected.tags,description:selected.description,constraints:selected.constraints,examples:selected.examples,starterCode:selected.starterCode},tests:selected.tests.map((t,i)=>({...t,order:i}))}:{problem:{title:title.trim(),difficulty,tags:[],description:description.trim(),constraints:constraints.split('\n').map(v=>v.trim()).filter(Boolean),examples:[{input:exampleInput,output:exampleOutput}],starterCode:undefined},tests:tests.map((t,i)=>({...t,order:i}))};
    const r=await fetch(`/api/rooms/${roomId}/problem`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});const j=await r.json();setBusy(false);if(!r.ok){setError(j.error??'Could not save the challenge.');return;}onSaved();
  }
  async function clear(){if(!window.confirm('Remove the current challenge and all of its test cases?'))return;setBusy(true);await fetch(`/api/rooms/${roomId}/problem`,{method:'DELETE'});setBusy(false);onSaved();}
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal challenge-modal" onMouseDown={e=>e.stopPropagation()}><button className="icon-button modal-close" onClick={onClose}><X size={16}/></button><div className="eyebrow">Challenge builder</div><h2>Set up the problem like a real interview.</h2><p>Curated problems arrive with the statement, starter code and tests. Custom problems let an interviewer define the same pieces manually.</p><div className="segmented"><button className={tab==='library'?'active':''} onClick={()=>setTab('library')}>Problem library</button><button className={tab==='custom'?'active':''} onClick={()=>setTab('custom')}>Write custom</button></div>{tab==='library'?<div className="problem-library">{PROBLEM_TEMPLATES.map(t=><button key={t.id} className={`problem-template ${selected?.id===t.id?'selected':''}`} onClick={()=>chooseTemplate(t)}><div><span className={`difficulty-pill ${t.difficulty.toLowerCase()}`}>{t.difficulty}</span><strong>{t.title}</strong></div><p>{t.description}</p><span className="template-tags">{t.tags.join(' · ')}</span></button>)}</div>:<div className="custom-problem-form"><div className="field"><label>Problem title</label><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Longest Subarray with K Distinct Values"/></div><div className="field-row"><div className="field"><label>Difficulty</label><select value={difficulty} onChange={e=>setDifficulty(e.target.value as Problem['difficulty'])}><option>EASY</option><option>MEDIUM</option><option>HARD</option></select></div><div className="field"><label>Example input</label><input value={exampleInput} onChange={e=>setExampleInput(e.target.value)} placeholder="[1,2,3]"/></div><div className="field"><label>Example output</label><input value={exampleOutput} onChange={e=>setExampleOutput(e.target.value)} placeholder="3"/></div></div><div className="field"><label>Problem statement</label><textarea rows={5} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Describe the task, expected output and edge cases."/></div><div className="field"><label>Constraints — one per line</label><textarea rows={4} value={constraints} onChange={e=>setConstraints(e.target.value)} placeholder="1 ≤ n ≤ 10^5\nValues are distinct"/></div><div className="custom-tests"><div className="mini-title">Test cases</div>{tests.map((t:any,i:number)=><div className="test-editor-row" key={i}><strong>{t.name}</strong><span>{t.hidden?'Hidden':'Public'}</span><button className="icon-button small" onClick={()=>setTests(prev=>prev.filter((_,idx)=>idx!==i))}><Trash2 size={13}/></button></div>)}<div className="test-builder"><input value={testName} onChange={e=>setTestName(e.target.value)} placeholder="Test name"/><input value={testInput} onChange={e=>setTestInput(e.target.value)} placeholder="Input"/><input value={testExpected} onChange={e=>setTestExpected(e.target.value)} placeholder="Expected output"/><label className="inline-check"><input type="checkbox" checked={testHidden} onChange={e=>setTestHidden(e.target.checked)}/> Hidden</label><button className="button button-ghost" onClick={addCustomTest}>Add test</button></div></div></div>}{error&&<div className="form-error">{error}</div>}<div className="modal-actions"><button className="button button-ghost" onClick={clear} disabled={busy}>Clear challenge</button><div className="modal-actions-right"><button className="button button-ghost" onClick={onClose}>Cancel</button><button className="button button-gold" onClick={save} disabled={busy || (tab==='library'&&!selected) || (tab==='custom'&&(!title.trim()||!description.trim()))}>{busy?'Saving…':'Save challenge'}</button></div></div></div></div>;
}
