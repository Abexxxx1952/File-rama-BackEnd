export type updateMany = (
  | {
      fileId: `${string}-${string}-${string}-${string}-${string}`;
      fileName?: string;
      parentFolderId?: `${string}-${string}-${string}-${string}-${string}`;
      fileDescription?: string;
    }
  | {
      folderId: `${string}-${string}-${string}-${string}-${string}`;
      folderName?: string;
      parentFolderId?: `${string}-${string}-${string}-${string}-${string}`;
    }
)[];
