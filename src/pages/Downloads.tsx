import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FileImage, 
  FileVideo, 
  FileAudio, 
  FileText, 
  Download, 
  Calendar, 
  HardDrive 
} from 'lucide-react';
import { format } from 'date-fns';

interface DownloadedFile {
  name: string;
  category: string;
  url: string;
  size: number;
  created_at: string;
  modified_at: string;
}

export default function Downloads() {
  const [files, setFiles] = useState<DownloadedFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<DownloadedFile | null>(null);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      const data = await apiFetch('/api/downloads');
      setFiles(data);
    } catch (e) {
      console.error(e);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getIcon = (category: string) => {
    switch (category) {
      case 'image': return <FileImage className="w-10 h-10 text-blue-500" />;
      case 'video': return <FileVideo className="w-10 h-10 text-red-500" />;
      case 'audio': return <FileAudio className="w-10 h-10 text-yellow-500" />;
      default: return <FileText className="w-10 h-10 text-gray-500" />;
    }
  };

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Download className="w-6 h-6" />
          Downloads Library
        </h1>
        <div className="text-sm text-muted-foreground">
          {files.length} files
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-10">
          {files.map((file, i) => (
            <Card 
              key={i} 
              className="p-4 cursor-pointer hover:bg-accent/50 transition-colors flex flex-col gap-3"
              onClick={() => setSelectedFile(file)}
            >
              <div className="aspect-video bg-muted/30 rounded-md flex items-center justify-center relative overflow-hidden group">
                 {file.category === 'image' ? (
                   <img src={file.url} alt={file.name} className="w-full h-full object-cover" loading="lazy" />
                 ) : (
                   getIcon(file.category)
                 )}
                 <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-medium">
                   Click to Preview
                 </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate text-sm" title={file.name}>{file.name}</h3>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                   <span className="flex items-center gap-1"><HardDrive className="w-3 h-3" /> {formatSize(file.size)}</span>
                   <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {format(new Date(file.modified_at), 'MMM d, HH:mm')}</span>
                </div>
              </div>
            </Card>
          ))}
          
          {files.length === 0 && (
            <div className="col-span-full text-center py-20 text-muted-foreground">
              No downloaded files found. Ask the bot to download something!
            </div>
          )}
        </div>
      </ScrollArea>

      <Dialog open={!!selectedFile} onOpenChange={(open) => !open && setSelectedFile(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="truncate pr-8">{selectedFile?.name}</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 bg-black/5 flex items-center justify-center p-4 min-h-[300px] overflow-auto">
            {selectedFile && (
              <>
                {selectedFile.category === 'image' && (
                  <img src={selectedFile.url} alt={selectedFile.name} className="max-w-full max-h-[70vh] object-contain rounded-md" />
                )}
                {selectedFile.category === 'video' && (
                  <video controls className="max-w-full max-h-[70vh] rounded-md" autoPlay>
                    <source src={selectedFile.url} />
                    Your browser does not support the video tag.
                  </video>
                )}
                {selectedFile.category === 'audio' && (
                  <div className="w-full max-w-md p-6 bg-background rounded-xl shadow-sm border">
                    <div className="flex justify-center mb-6">
                      <FileAudio className="w-24 h-24 text-primary/50" />
                    </div>
                    <audio controls className="w-full">
                      <source src={selectedFile.url} />
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                )}
                {selectedFile.category === 'document' && (
                   <div className="text-center">
                     <FileText className="w-20 h-20 mx-auto text-muted-foreground mb-4" />
                     <p className="mb-4">Document preview not supported in browser.</p>
                     <a href={selectedFile.url} download className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
                       <Download className="w-4 h-4" /> Download File
                     </a>
                   </div>
                )}
              </>
            )}
          </div>
          
          <div className="p-4 border-t bg-muted/20 flex justify-end gap-2">
             <a href={selectedFile?.url} download target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-muted transition-colors text-sm font-medium">
               <Download className="w-4 h-4" /> Download
             </a>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
