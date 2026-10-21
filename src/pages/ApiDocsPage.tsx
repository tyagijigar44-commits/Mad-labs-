import React, { useState, useEffect } from 'react';
import {
  FileCode,
  Download,
  Copy,
  Check,
  Server,
  Database,
  ExternalLink,
  Code2,
} from 'lucide-react';

export const ApiDocsPage: React.FC = () => {
  const [openApi, setOpenApi] = useState<any>(null);
  const [schemaSql, setSchemaSql] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'openapi' | 'postgres'>('openapi');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/openapi.json')
      .then(res => res.json())
      .then(setOpenApi)
      .catch(console.error);

    fetch('/api/schema.sql')
      .then(res => res.text())
      .then(setSchemaSql)
      .catch(console.error);
  }, []);

  const handleCopySchema = () => {
    navigator.clipboard.writeText(schemaSql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight">API Documentation & PostgreSQL Architecture</h1>
          <p className="text-xs text-slate-500 mt-0.5">OpenAPI 3.0 clinical endpoints specification and complete normalized PostgreSQL DDL schema</p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('openapi')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'openapi' ? 'bg-white text-slate-900 font-bold shadow-2xs' : 'text-slate-600'
            }`}
          >
            <Server className="w-3.5 h-3.5 text-teal-600" />
            <span>OpenAPI 3.0 Spec</span>
          </button>
          <button
            onClick={() => setActiveTab('postgres')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'postgres' ? 'bg-white text-slate-900 font-bold shadow-2xs' : 'text-slate-600'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-blue-600" />
            <span>PostgreSQL Schema (DDL)</span>
          </button>
        </div>
      </div>

      {/* OpenAPI Explorer */}
      {activeTab === 'openapi' && openApi && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 uppercase font-mono">
                OpenAPI {openApi.openapi}
              </span>
              <h2 className="text-base font-bold text-slate-900">{openApi.info.title} (v{openApi.info.version})</h2>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">{openApi.info.description}</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 font-bold text-xs text-slate-800 uppercase tracking-wider">
              Documented REST Endpoints ({Object.keys(openApi.paths || {}).length})
            </div>
            <div className="divide-y divide-slate-100">
              {Object.entries(openApi.paths || {}).map(([pathStr, methods]: [string, any]) => (
                <div key={pathStr} className="p-4 space-y-2 hover:bg-slate-50/50 transition-colors">
                  {Object.entries(methods).map(([method, details]: [string, any]) => (
                    <div key={method} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                            method === 'get' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {method}
                        </span>
                        <span className="font-mono font-bold text-xs text-slate-900">{pathStr}</span>
                        <span className="text-xs text-slate-500">— {details.summary}</span>
                      </div>
                      {details.description && (
                        <p className="text-[11px] text-slate-500 pl-14">{details.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PostgreSQL DDL Explorer */}
      {activeTab === 'postgres' && (
        <div className="space-y-4">
          <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-teal-400" />
                <h3 className="font-bold text-sm">PostgreSQL Production Schema Migration Script</h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Normalized database tables, primary keys, foreign key constraints, and performance indexes for Module 19.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopySchema}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied' : 'Copy DDL'}</span>
              </button>
              <a
                href="/api/schema.sql"
                download="ApexLIS_PostgreSQL_Schema.sql"
                className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Download .sql</span>
              </a>
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-inner overflow-x-auto">
            <pre className="font-mono text-xs leading-relaxed text-teal-300 max-h-[550px] whitespace-pre select-all">
              {schemaSql || '-- Loading PostgreSQL schema...'}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
