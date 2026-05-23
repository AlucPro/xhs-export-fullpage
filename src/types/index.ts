export interface PostData {
  postId: string;
  title: string;
  author: {
    name: string;
    avatar: string;
  };
  content: string;
  tags: string[];
  mediaType: 'image' | 'video' | 'text';
  images: string[];
  postUrl: string;
}

export interface ExportTask {
  postId: string;
  url: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  error?: string;
}

export interface ExportResult {
  postId: string;
  title: string;
  success: boolean;
  error?: string;
}

export interface ExtensionSettings {
  imageFormat: 'png' | 'jpeg';
  imageQuality: number;
  filenameTemplate: string;
}
