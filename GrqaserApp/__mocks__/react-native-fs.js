const mockDownloadFile = jest.fn().mockReturnValue({
  promise: Promise.resolve({statusCode: 200, bytesWritten: 1024}),
});
const mockExists = jest.fn().mockResolvedValue(false);
const mockMkdir = jest.fn().mockResolvedValue(undefined);
const mockUnlink = jest.fn().mockResolvedValue(undefined);
const mockStat = jest.fn().mockResolvedValue({size: 1024});
const mockReadDir = jest.fn().mockResolvedValue([]);
const mockGetFSInfo = jest.fn().mockResolvedValue({
  totalSpace: 64000000000,
  freeSpace: 32000000000,
});

const RNFS = {
  DocumentDirectoryPath: '/mock/documents',
  downloadFile: mockDownloadFile,
  exists: mockExists,
  mkdir: mockMkdir,
  unlink: mockUnlink,
  stat: mockStat,
  readDir: mockReadDir,
  getFSInfo: mockGetFSInfo,
};

module.exports = RNFS;
module.exports.default = RNFS;
module.exports.__mockDownloadFile = mockDownloadFile;
module.exports.__mockExists = mockExists;
module.exports.__mockMkdir = mockMkdir;
module.exports.__mockUnlink = mockUnlink;
module.exports.__mockStat = mockStat;
module.exports.__mockReadDir = mockReadDir;
module.exports.__mockGetFSInfo = mockGetFSInfo;
