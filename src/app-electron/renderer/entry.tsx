import { createRoot } from 'react-dom/client';
import { App } from '../../editor/App';
import { services } from './composition';
import { startExportWorker } from './export-worker';

if(new URLSearchParams(location.search).get('mode')==='export')startExportWorker();
else createRoot(document.getElementById('root')!).render(<App services={services}/>);
