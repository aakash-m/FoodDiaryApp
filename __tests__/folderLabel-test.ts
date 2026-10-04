import { describeFolderUri } from '@/lib/folderLabel';

const tree = (docId: string) => `content://com.android.externalstorage.documents/tree/${encodeURIComponent(docId)}`;

describe('describeFolderUri', () => {
  it('shows the path inside phone storage', () => {
    expect(describeFolderUri(tree('primary:Documents/FoodDiary'))).toBe('Documents/FoodDiary');
    expect(describeFolderUri(`${tree('primary:Documents/FoodDiary')}/`)).toBe('Documents/FoodDiary');
  });

  it('labels the storage root and SD cards', () => {
    expect(describeFolderUri(tree('primary:'))).toBe('Phone storage');
    expect(describeFolderUri(tree('1A2B-3C4D:Backups'))).toBe('SD card/Backups');
  });

  it('decodes special characters', () => {
    expect(describeFolderUri(tree('primary:Documents/Food Diary (Anna)'))).toBe('Documents/Food Diary (Anna)');
  });

  it('handles missing and non-tree URIs', () => {
    expect(describeFolderUri(null)).toBeNull();
    expect(describeFolderUri('file:///data/x')).toBe('file:///data/x');
  });
});
