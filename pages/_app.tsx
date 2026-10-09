import '@fontsource/nunito/latin-700.css';
import '@fontsource/nunito/latin-800.css';
import '@fontsource/nunito/latin-900.css';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/dm-sans/latin-700.css';
import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { ProgressProvider } from '../lib/store';
import { RecallProvider } from '../lib/recall-store';

export default function App({ Component, pageProps }: AppProps) {
  return <ProgressProvider><RecallProvider><Component {...pageProps} /></RecallProvider></ProgressProvider>;
}
