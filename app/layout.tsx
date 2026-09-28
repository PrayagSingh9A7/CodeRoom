import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import AppHeader from '@/components/AppHeader';

export const metadata = {
  title: 'CodeRoom — Collaborative Coding & Cloud Execution',
  description: 'A refined collaborative coding workspace with live multiplayer editing, secure execution and replayable sessions.'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><ThemeProvider><AppHeader />{children}</ThemeProvider></body></html>;
}
