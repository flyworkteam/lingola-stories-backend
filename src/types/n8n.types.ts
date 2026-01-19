export interface N8NStoryResponse {
  batchId: string;
  totalStories: number;
  stories: Array<{
    id: string;
    level: string;
    batchId: string;
    status: string;
    totalWords: number;
    // n8n artık Prisma'ya hazır formatta gönderiyor:
    localizations: {
      create: Array<{
        lang: string;
        title: string;
        text: string;
        summary: string;
      }>;
    };
    assets: {
      create: Array<{
        assetType: string;
        lang?: string | null;
        url: string;
      }>;
    };
    tags: {
      create: Array<{
        tag: {
          connectOrCreate: {
            where: { slug: string };
            create: { slug: string; name: string };
          };
        };
      }>;
    };
  }>;
}
