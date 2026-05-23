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

export interface BatchState {
  postIds: string[];
  currentIndex: number;
  successCount: number;
  failures: Array<{ postId: string; error: string }>;
  returnUrl: string;
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
