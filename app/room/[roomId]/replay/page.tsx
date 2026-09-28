import ReplayClient from '@/components/ReplayClient';
export default async function ReplayPage({ params }:{ params: Promise<{ roomId:string }> }){ const { roomId }=await params; return <ReplayClient roomId={roomId}/>; }
