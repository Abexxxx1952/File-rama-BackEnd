import { SetMetadata } from '@nestjs/common';

import { Class } from 'type-fest';

export const REQUEST_BODY_LOGGING_KEY = 'request_body_logging';

export const ParseRequestBodyWhenLogging = (dtoClass: Class<unknown>) => {
  return SetMetadata(REQUEST_BODY_LOGGING_KEY, dtoClass);
};
