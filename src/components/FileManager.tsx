import React, { useState, useEffect, useRef } from 'react';
import { Folder, File, Upload, Plus, Trash2, Edit2, ChevronRight, Home, RefreshCw, Save, X, Shield } from 'lucide-react';

interface FileItem {
  name: string;
  isDir: boolean;
  size: number;
  mtime: number;
  permissions: string;
}

const FileManager = () => {
  const [currentPath, setCurrentPath] = useState('/');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Editor state
  const [editingFile, setEditingFile] = useState<{name: string, content: string} | null>(null);
  const [savingFile, setSavingFile] = useState(false);

  // Modals state
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [showNewFile, setShowNewFile] = useState(false);
  const [showChmod, setShowChmod] = useState<{name: string, perms: string} | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newPerms, setNewPerms] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = async (path: string) => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/files/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ path })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch files');
      setFiles(data.files);
      setCurrentPath(path);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles(currentPath);
  }, []);

  const handleNavigate = (folderName: string) => {
    const newPath = currentPath.endsWith('/') 
      ? `${currentPath}${folderName}` 
      : `${currentPath}/${folderName}`;
    fetchFiles(newPath);
  };

  const handleNavigateUp = () => {
    if (currentPath === '/') return;
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    const newPath = '/' + parts.join('/');
    fetchFiles(newPath);
  };

  const handleNavigateHome = () => {
    fetchFiles('/');
  };

  const handleCreateItem = async (isDir: boolean) => {
    if (!newItemName) return;
    try {
      const token = localStorage.getItem('token');
      const path = currentPath.endsWith('/') ? `${currentPath}${newItemName}` : `${currentPath}/${newItemName}`;
      const res = await fetch('/api/files/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ path, isDir })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create');
      }
      setNewItemName('');
      setShowNewFolder(false);
      setShowNewFile(false);
      fetchFiles(currentPath);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (name: string, isDir: boolean) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
      const token = localStorage.getItem('token');
      const path = currentPath.endsWith('/') ? `${currentPath}${name}` : `${currentPath}/${name}`;
      const res = await fetch('/api/files/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ path, isDir })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }
      fetchFiles(currentPath);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleChmod = async () => {
    if (!showChmod || !newPerms) return;
    try {
      const token = localStorage.getItem('token');
      const path = currentPath.endsWith('/') ? `${currentPath}${showChmod.name}` : `${currentPath}/${showChmod.name}`;
      const res = await fetch('/api/files/chmod', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ path, mode: newPerms })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to change permissions');
      }
      setShowChmod(null);
      setNewPerms('');
      fetchFiles(currentPath);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    const path = currentPath.endsWith('/') ? `${currentPath}${file.name}` : `${currentPath}/${file.name}`;
    formData.append('path', path);

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/files/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Upload failed');
      }
      fetchFiles(currentPath);
    } catch (err: any) {
      alert(err.message);
      setLoading(false);
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpenFile = async (name: string) => {
    try {
      const token = localStorage.getItem('token');
      const path = currentPath.endsWith('/') ? `${currentPath}${name}` : `${currentPath}/${name}`;
      const res = await fetch('/api/files/read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ path })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to read file');
      
      setEditingFile({ name, content: data.content });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveFile = async () => {
    if (!editingFile) return;
    setSavingFile(true);
    try {
      const token = localStorage.getItem('token');
      const path = currentPath.endsWith('/') ? `${currentPath}${editingFile.name}` : `${currentPath}/${editingFile.name}`;
      const res = await fetch('/api/files/write', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ path, content: editingFile.content })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save file');
      }
      setEditingFile(null);
      fetchFiles(currentPath);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingFile(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (mtime: number) => {
    return new Date(mtime).toLocaleString();
  };

  if (editingFile) {
    return (
      <div className="h-full flex flex-col space-y-4">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-base flex items-center gap-2">
              <File className="w-6 h-6 text-accent-base" />
              {editingFile.name}
            </h1>
            <p className="text-text-muted mt-1 text-sm">{currentPath}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setEditingFile(null)}
              className="px-4 py-2 bg-bg-hover hover:bg-bg-hover text-text-base rounded-xl transition-colors text-sm font-medium flex items-center gap-2"
            >
              <X className="w-4 h-4" /> Cancel
            </button>
            <button
              onClick={handleSaveFile}
              disabled={savingFile}
              className="px-4 py-2 bg-accent-base hover:bg-accent-hover text-zinc-950 rounded-xl transition-colors text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> {savingFile ? 'Saving...' : 'Save'}
            </button>
          </div>
        </header>
        <div className="flex-1 bg-bg-base border border-border-base rounded-2xl overflow-hidden">
          <textarea
            value={editingFile.content}
            onChange={(e) => setEditingFile({...editingFile, content: e.target.value})}
            className="w-full h-full bg-transparent text-text-muted font-mono text-sm p-4 focus:outline-none resize-none"
            spellCheck={false}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-base">File Manager</h1>
          <p className="text-text-muted mt-2">Manage your server files</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewFolder(true)}
            className="px-3 py-2 bg-bg-hover hover:bg-bg-hover text-text-base rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
          >
            <Folder className="w-4 h-4" /> New Folder
          </button>
          <button
            onClick={() => setShowNewFile(true)}
            className="px-3 py-2 bg-bg-hover hover:bg-bg-hover text-text-base rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
          >
            <File className="w-4 h-4" /> New File
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2 bg-accent-base/10 hover:bg-accent-base/20 text-accent-hover rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
          >
            <Upload className="w-4 h-4" /> Upload
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
          />
        </div>
      </header>

      <div className="bg-bg-panel border border-border-base rounded-2xl flex-1 flex flex-col overflow-hidden">
        {/* Breadcrumb */}
        <div className="px-4 py-3 border-b border-border-base flex items-center gap-2 bg-bg-base/50">
          <button onClick={handleNavigateHome} className="p-1.5 text-text-muted hover:text-text-base hover:bg-bg-hover rounded-md transition-colors">
            <Home className="w-4 h-4" />
          </button>
          <ChevronRight className="w-4 h-4 text-zinc-600" />
          <div className="flex-1 flex items-center gap-1 overflow-x-auto no-scrollbar text-sm text-text-muted">
            {currentPath}
          </div>
          <button onClick={() => fetchFiles(currentPath)} className="p-1.5 text-text-muted hover:text-text-base hover:bg-bg-hover rounded-md transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* File List */}
        <div className="flex-1 overflow-y-auto">
          {error ? (
            <div className="p-6 text-red-400 flex items-center justify-center h-full">
              <div className="text-center">
                <p className="mb-4">{error}</p>
                <button onClick={() => fetchFiles(currentPath)} className="px-4 py-2 bg-bg-hover rounded-lg text-sm">Retry</button>
              </div>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-bg-panel border-b border-border-base z-10">
                <tr>
                  <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider w-1/2">Name</th>
                  <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Size</th>
                  <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider hidden sm:table-cell">Modified</th>
                  <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider hidden md:table-cell">Perms</th>
                  <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {currentPath !== '/' && (
                  <tr className="hover:bg-bg-hover/50 transition-colors cursor-pointer" onClick={handleNavigateUp}>
                    <td className="px-4 py-3 flex items-center gap-3">
                      <Folder className="w-5 h-5 text-blue-500" />
                      <span className="text-text-base font-medium">..</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">-</td>
                    <td className="px-4 py-3 text-sm text-text-muted hidden sm:table-cell">-</td>
                    <td className="px-4 py-3 text-sm text-text-muted hidden md:table-cell">-</td>
                    <td className="px-4 py-3 text-right"></td>
                  </tr>
                )}
                {files.map((file) => (
                  <tr key={file.name} className="hover:bg-bg-hover/50 transition-colors group">
                    <td 
                      className="px-4 py-3 flex items-center gap-3 cursor-pointer"
                      onClick={() => file.isDir ? handleNavigate(file.name) : handleOpenFile(file.name)}
                    >
                      {file.isDir ? (
                        <Folder className="w-5 h-5 text-blue-500" />
                      ) : (
                        <File className="w-5 h-5 text-text-muted" />
                      )}
                      <span className="text-text-base font-medium truncate">{file.name}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {file.isDir ? '-' : formatSize(file.size)}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted hidden sm:table-cell">
                      {formatDate(file.mtime)}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-text-muted hidden md:table-cell">
                      {file.permissions}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setShowChmod({ name: file.name, perms: file.permissions }); }}
                          className="p-1.5 text-text-muted hover:text-blue-500 hover:bg-blue-400/10 rounded-md transition-colors"
                          title="Change Permissions"
                        >
                          <Shield className="w-4 h-4" />
                        </button>
                        {!file.isDir && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleOpenFile(file.name); }}
                            className="p-1.5 text-text-muted hover:text-accent-hover hover:bg-accent-hover/10 rounded-md transition-colors"
                            title="Edit File"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDelete(file.name, file.isDir); }}
                          className="p-1.5 text-text-muted hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {files.length === 0 && !loading && currentPath === '/' && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-text-muted">
                      No files found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modals */}
      {(showNewFolder || showNewFile) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-bg-panel border border-border-base rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-text-base mb-4">
              Create New {showNewFolder ? 'Folder' : 'File'}
            </h3>
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="Name"
              className="w-full px-4 py-2 bg-bg-base border border-border-base rounded-xl text-text-base placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-accent-base/50 mb-6"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowNewFolder(false); setShowNewFile(false); setNewItemName(''); }}
                className="px-4 py-2 text-text-muted hover:text-text-base transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleCreateItem(showNewFolder)}
                disabled={!newItemName}
                className="px-4 py-2 bg-accent-base hover:bg-accent-hover text-zinc-950 rounded-xl transition-colors font-medium disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {showChmod && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-bg-panel border border-border-base rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-text-base mb-2">Change Permissions</h3>
            <p className="text-sm text-text-muted mb-4">For {showChmod.name}</p>
            <input
              type="text"
              value={newPerms}
              onChange={(e) => setNewPerms(e.target.value)}
              placeholder="e.g. 755 or 644"
              className="w-full px-4 py-2 bg-bg-base border border-border-base rounded-xl text-text-base placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-accent-base/50 mb-6 font-mono"
              maxLength={3}
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowChmod(null); setNewPerms(''); }}
                className="px-4 py-2 text-text-muted hover:text-text-base transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleChmod}
                disabled={!newPerms || newPerms.length !== 3}
                className="px-4 py-2 bg-accent-base hover:bg-accent-hover text-zinc-950 rounded-xl transition-colors font-medium disabled:opacity-50"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileManager;
