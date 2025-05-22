export type DriveInfoSuccessResult = {
  driveEmail: string;
  totalSpace: number;
  usedSpace: number;
  availableSpace: number;
};

export type DriveInfoErrorResult = {
  driveEmail: string;
  error: 'Connection error';
  errorMessage: string;
};

export type DriveInfoResult = DriveInfoSuccessResult | DriveInfoErrorResult;
