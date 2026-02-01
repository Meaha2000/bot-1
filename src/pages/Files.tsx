import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FolderOpen, Upload, Image, Video, Music, FileText, Download, Trash2, Search, Shield, Brain } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';

interface MediaFile {
  id: string;
  filename: string;
  original_name: string;
  mime_type: string;
  category: string;
  file_size: number;
  platform?: string;
  chat_id?: string;
  processed: boolean;
  created_at: string;
  is_permanent?: number;
}

interface FileStats {
  totalFiles: number;
  totalSize: number;
  byCategory: Record<string, { count: number; size: number }>;
}

const CATEGORY_ICONS = {
  images: <Image className="w-4 h-4 text-pink-500" />,
  videos: <Video className="w-4 h-4 text-red-500" />,
  audios: <Music className="w-4 h-4 text-purple-500" />,
  documents: <FileText className="w-4 h-4 text-blue-500" />,
};

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function FilesPage() {
  const { user } = useAuth();
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [stats, setStats] = useState<FileStats | null>(null);
  const [storagePath, setStoragePath] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [dragActive, setDragActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user) {
      fetchFiles();
      fetchStats();
      fetchPath();
    }
  }, [user, selectedCategory]);

  const fetchPath = async () => {
    try {
      const data = await apiFetch('/api/files/path');
      setStoragePath(data.path);
    } catch (err) {
      console.error('Failed to fetch storage path:', err);
    }
  };

  const fetchFiles = async () => {
    setIsLoading(true);
    try {
      const url = selectedCategory === 'all' 
        ? '/api/files' 
        : `/api/files?category=${selectedCategory}`;
      const data = await apiFetch(url);
      setFiles(data);
    } catch (err) {
      console.error('Failed to fetch files:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await apiFetch('/api/files/stats');
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement> | DragEvent) => {
    let fileList: FileList | null = null;
    if (e instanceof Event) {
       // drag event
    } else if ('target' in e && e.target.files) {
       fileList = e.target.files;
    }

    if (!fileList || fileList.length === 0) return;
    
    setIsUploading(true);
    const formData = new FormData();
    Array.from(fileList).forEach(file => {
      formData.append('files', file);
    });

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) throw new Error('Upload failed');
      
      toast.success(`Uploaded ${fileList.length} files successfully`);
      fetchFiles();
      fetchStats();
    } catch (err) {
      toast.error('Failed to upload files');
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleProcessKnowledge = async (id: string) => {
    try {
      toast.loading('Processing file for Knowledge Bank...');
      await apiFetch(`/api/files/${id}/process-knowledge`, { method: 'POST' });
      toast.dismiss();
      toast.success('Added to Knowledge Bank');
    } catch (err) {
      toast.dismiss();
      toast.error('Failed to process file');
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this file?')) return;
    try {
      await apiFetch(`/api/files/${id}`, { method: 'DELETE' });
      toast.success('File deleted');
      setFiles(prev => prev.filter(f => f.id !== id));
      fetchStats();
    } catch (err) {
      toast.error('Failed to delete file');
    }
  };

  const handleTogglePermanent = async (id: string, currentStatus: boolean) => {
    try {
      const res = await apiFetch(`/api/files/${id}/permanent`, {
        method: 'PUT',
        body: JSON.stringify({ isPermanent: !currentStatus })
      });
      setFiles(prev => prev.map(f => f.id === id ? { ...f, is_permanent: res.is_permanent } : f));
      toast.success(res.is_permanent ? 'File marked as permanent' : 'File unmarked as permanent');
    } catch (err) {
      toast.error('Failed to update file status');
    }
  };

  // Drag and Drop
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
       // trigger upload logic
       const input = document.createElement('input');
       input.type = 'file';
       input.multiple = true;
       // We can't set input.files directly easily, so we just call the upload logic manually
       // Refactor upload logic to accept File[]
       const formData = new FormData();
       Array.from(e.dataTransfer.files).forEach(file => {
         formData.append('files', file);
       });
       
       setIsUploading(true);
       const token = localStorage.getItem('token');
       fetch('/api/files/upload', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
       }).then(res => {
          if (!res.ok) throw new Error('Upload failed');
          toast.success('Files uploaded');
          fetchFiles();
          fetchStats();
       }).catch(err => {
          toast.error('Upload failed');
       }).finally(() => setIsUploading(false));
    }
  }, []);

  const filteredFiles = files.filter(f => 
    f.original_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    f.category.includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 animate-fade-in space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-mono font-bold tracking-tight flex items-center gap-2">
            <FolderOpen className="w-8 h-8" />
            File Storage
        </h1>
        <p className="text-muted-foreground font-mono text-sm">
           Manage uploaded media and documents. Non-permanent files are auto-deleted after 7 days.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="md:col-span-3 border-border bg-card/50 shadow-sm">
           <CardContent className="p-6">
              <div 
                className={`border-2 border-dashed rounded-xl h-32 flex flex-col items-center justify-center transition-all cursor-pointer relative overflow-hidden ${
                    dragActive ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50 hover:bg-secondary/50'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                 <input 
                    id="file-upload" 
                    type="file" 
                    multiple 
                    className="hidden" 
                    onChange={handleFileUpload} 
                 />
                 <Upload className={`w-8 h-8 mb-2 transition-transform duration-300 ${isUploading ? 'animate-bounce text-primary' : 'text-muted-foreground'}`} />
                 <p className="font-mono text-sm text-muted-foreground">
                    {isUploading ? 'Uploading...' : 'Drag & drop files here or click to browse'}
                 </p>
              </div>
           </CardContent>
        </Card>
        
        <Card className="border-border bg-card/50 shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-mono font-bold uppercase tracking-wider text-muted-foreground">Storage Usage</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-mono font-bold">{stats ? formatFileSize(stats.totalSize) : '...'}</div>
                <div className="text-xs text-muted-foreground font-mono mt-1 mb-4">
                    {stats?.totalFiles || 0} files total
                </div>
                <div className="space-y-2">
                    {Object.entries(stats?.byCategory || {}).map(([cat, data]) => (
                        <div key={cat} className="flex justify-between text-[10px] font-mono uppercase">
                            <span className="opacity-70">{cat}</span>
                            <span>{formatFileSize(data.size)}</span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between gap-4">
          <Tabs defaultValue="all" onValueChange={setSelectedCategory} className="w-full">
            <div className="flex items-center justify-between mb-4">
                <TabsList className="bg-secondary/50">
                    <TabsTrigger value="all" className="font-mono text-xs">All</TabsTrigger>
                    <TabsTrigger value="images" className="font-mono text-xs">Images</TabsTrigger>
                    <TabsTrigger value="videos" className="font-mono text-xs">Videos</TabsTrigger>
                    <TabsTrigger value="audios" className="font-mono text-xs">Audio</TabsTrigger>
                    <TabsTrigger value="documents" className="font-mono text-xs">Docs</TabsTrigger>
                </TabsList>
                <div className="relative w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search files..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 h-9 font-mono text-xs bg-background/50"
                    />
                </div>
            </div>

            <TabsContent value={selectedCategory} className="mt-0">
                <ScrollArea className="h-[500px] rounded-md border border-border bg-card">
                    {isLoading ? (
                        <div className="p-8 text-center font-mono text-sm text-muted-foreground">Loading files...</div>
                    ) : filteredFiles.length === 0 ? (
                        <div className="p-12 flex flex-col items-center justify-center text-muted-foreground opacity-50">
                            <FolderOpen className="w-12 h-12 mb-4" />
                            <p className="font-mono text-sm">No files found</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
                            {filteredFiles.map((file) => (
                                <Card key={file.id} className="group overflow-hidden border-border/50 hover:border-primary/50 transition-all bg-secondary/10 hover:bg-secondary/30">
                                    <div className="aspect-video bg-black/5 flex items-center justify-center relative overflow-hidden">
                                        {file.category === 'images' ? (
                                            <img src={`/api/files/${file.id}/content`} alt={file.original_name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                        ) : (
                                            <div className="p-4 rounded-full bg-background/50 backdrop-blur-sm">
                                                {CATEGORY_ICONS[file.category as keyof typeof CATEGORY_ICONS] || <FileText className="w-6 h-6" />}
                                            </div>
                                        )}
                                        
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full" onClick={() => window.open(`/api/files/${file.id}/content`, '_blank')}>
                                                <Download className="w-4 h-4" />
                                            </Button>
                                            <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full" onClick={() => handleProcessKnowledge(file.id)} title="Add to Knowledge Bank">
                                                <Brain className="w-4 h-4" />
                                            </Button>
                                            <Button size="icon" variant="destructive" className="h-8 w-8 rounded-full" onClick={() => handleDelete(file.id)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                        
                                        {file.is_permanent === 1 && (
                                            <div className="absolute top-2 right-2">
                                                <Badge variant="secondary" className="bg-green-500/20 text-green-500 hover:bg-green-500/30 border-green-500/20 text-[10px]">
                                                    <Shield className="w-3 h-3 mr-1" /> Perm
                                                </Badge>
                                            </div>
                                        )}
                                    </div>
                                    <CardContent className="p-3 space-y-2">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="font-mono text-xs font-bold truncate flex-1" title={file.original_name}>
                                                {file.original_name}
                                            </div>
                                            <Badge variant="outline" className="text-[10px] uppercase shrink-0 bg-background/50">
                                                {file.mime_type.split('/')[1] || 'FILE'}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                                            <span>{formatFileSize(file.file_size)}</span>
                                            <span>{new Date(file.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className={`w-full h-6 text-[10px] font-mono ${file.is_permanent ? 'text-green-500 hover:text-green-600' : 'text-muted-foreground hover:text-primary'}`}
                                            onClick={() => handleTogglePermanent(file.id, file.is_permanent === 1)}
                                        >
                                            {file.is_permanent ? 'Protected (Keep)' : 'Auto-delete in 7d'}
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </TabsContent>
          </Tabs>
      </div>
    </div>
  );
}